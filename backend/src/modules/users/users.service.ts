import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { CurrentUserPrincipal } from '../../auth/jwt.types';
import { LoginIssuer } from '../../auth/login-issuer';
import { TokenService } from '../../auth/token.service';
import { AppConfig } from '../../config/app.config';
import { isValidEmail, isValidName } from '../../common/validation';
import { DbContext } from '../../database/db-context';
import {
  ForgotPasswordRequest,
  LoggedInUserResponse,
  ResetPasswordRequest,
} from './access.dto';
import { EmailService } from '../../integrations/email/email.service';
import { EmailChangeRepository } from './email-change.repository';
import { RefreshTokenRepository } from './refresh-token.repository';
import {
  ConfirmEmailRequest,
  CountByRoleResponse,
  CreateRequest,
  EditProfileRequest,
  EditUserRequest,
  UserDTO,
} from './user.dto';
import { UserEntity } from './user.entity';
import { UserRepository } from './user.repository';
import {
  DeleteOwnUserException,
  DuplicateEmailException,
  EditOwnUserException,
  EmptyRolesException,
  InvalidEmail,
  InvalidFirstName,
  InvalidLastName,
  ExpiredResetTokenException,
  UserNotFoundException,
  WrongCredentialsException,
  WrongEmailChangePinException,
  WrongResetTokenException,
} from './user.exceptions';
import { randomPassword, userToDto } from './user.mapper';
import { isValidRole, rolesToDb } from './user-roles';

/** A 6-digit PIN from a CSPRNG (not Math.random) — uniform in [100000,999999]. */
const randomPin = (): string => String(randomInt(100000, 1000000));

/** Constant-time PIN comparison, so a wrong PIN doesn't leak via timing. */
const pinsEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};

@Injectable()
export class UsersService {
  constructor(
    private readonly db: DbContext,
    private readonly users: UserRepository,
    private readonly emailChanges: EmailChangeRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly email: EmailService,
    private readonly tokens: TokenService,
    private readonly issuer: LoginIssuer,
    private readonly config: ConfigService,
  ) {}

  /** Current user's entity (for /users/me). */
  findById(id: string): Promise<UserEntity | null> {
    return this.users.findById(id);
  }

  async getAllUsers(): Promise<UserDTO[]> {
    const list = await this.users.findAllActive();
    return list.map(userToDto);
  }

  // getUserById does not apply the deleted filter.
  async getUserById(userId: string): Promise<UserDTO> {
    const user = await this.users.findByIdIncludingDeleted(userId);
    if (!user) throw new UserNotFoundException();
    return userToDto(user);
  }

  async create(req: CreateRequest): Promise<UserDTO> {
    const email = req.email.trim().toLowerCase();
    // Abort on a duplicate email before save (the unique constraint is the
    // backstop — UserRepository maps it to the same error on insert).
    if (await this.users.findByEmail(email)) throw new DuplicateEmailException();
    if (!isValidEmail(email)) throw new InvalidEmail();
    if (!isValidName(req.firstName)) throw new InvalidFirstName();
    if (!isValidName(req.lastName)) throw new InvalidLastName();
    const roles = req.roles ?? [];
    if (roles.length === 0) throw new EmptyRolesException();
    if (!roles.every(isValidRole)) throw new BadRequestException('Invalid role');

    const firstName = req.firstName.trim();
    const lastName = req.lastName.trim();
    const entity = this.users.create({
      id: randomUUID(),
      firstName,
      lastName,
      email,
      password: await bcrypt.hash(randomPassword(firstName, lastName), 10),
      deleted: false,
      roles: rolesToDb(roles),
      isConfirmed: false,
    });
    await this.users.insert(entity);
    // Invitation email carrying a new-user password-reset token; the invitee
    // sets their password via the same reset-password page as forgot-password.
    const token = this.tokens.generatePasswordResetToken({ email }, true);
    const frontendUrl = this.config.getOrThrow<AppConfig>('app').frontendUrl;
    await this.email.sendEmail(
      email,
      'Invitation to join Qlarr.com',
      `You have been invited to join Qlarr. Set your password: ${frontendUrl}/reset-password?token=${token}`,
    );
    return userToDto(entity);
  }

  async update(
    userId: string,
    req: EditUserRequest,
    currentUserId: string,
  ): Promise<UserDTO> {
    // UUID comparison must be case-insensitive: `userId` is a raw path segment
    // (any case) while `currentUserId` is the lowercase JWT claim, and Postgres
    // `uuid` columns compare case-insensitively — so a strict === would let a
    // caller bypass this self-guard by uppercasing their own id.
    if (userId.toLowerCase() === currentUserId.toLowerCase()) {
      throw new EditOwnUserException();
    }
    const user = await this.users.findById(userId);
    if (!user) throw new UserNotFoundException();
    if (req.roles && req.roles.length === 0) throw new EmptyRolesException();
    if (req.firstName != null && !isValidName(req.firstName)) throw new InvalidFirstName();
    if (req.lastName != null && !isValidName(req.lastName)) throw new InvalidLastName();
    if (req.roles && !req.roles.every(isValidRole)) {
      throw new BadRequestException('Invalid role');
    }

    user.firstName = req.firstName?.trim() ?? user.firstName;
    user.lastName = req.lastName?.trim() ?? user.lastName;
    user.roles = req.roles && req.roles.length ? rolesToDb(req.roles) : user.roles;
    await this.users.save(user);
    return userToDto(user);
  }

  async editProfile(
    req: EditProfileRequest,
    principal: CurrentUserPrincipal,
  ): Promise<UserDTO> {
    const user = await this.users.findByIdWithPassword(principal.userId);
    if (!user) throw new UserNotFoundException();

    const newEmail = req.email?.trim().toLowerCase();
    const emailChanged = newEmail != null && user.email !== newEmail;
    const passwordChanged = req.newPassword != null;
    if (
      (passwordChanged || emailChanged) &&
      !(await bcrypt.compare(req.password ?? '', user.password))
    ) {
      throw new WrongCredentialsException();
    }
    if (req.email != null && !isValidEmail(req.email)) throw new InvalidEmail();
    if (req.firstName != null && !isValidName(req.firstName)) throw new InvalidFirstName();
    if (req.lastName != null && !isValidName(req.lastName)) throw new InvalidLastName();
    if (emailChanged && (await this.users.findByEmail(newEmail!))) {
      throw new DuplicateEmailException();
    }

    user.firstName = req.firstName?.trim() ?? user.firstName;
    user.lastName = req.lastName?.trim() ?? user.lastName;
    if (passwordChanged) {
      user.password = await bcrypt.hash(req.newPassword!, 10);
    }
    // The email itself changes only after PIN confirmation (confirmNewEmail);
    // here we just start the flow.
    if (emailChanged) {
      await this.startEmailChange(principal.userId, user.email, newEmail!);
    }
    if (passwordChanged) {
      await this.invalidateRefreshToken(principal);
    }
    await this.users.save(user);
    return userToDto(user);
  }

  private async startEmailChange(
    userId: string,
    oldEmail: string,
    newEmail: string,
  ): Promise<void> {
    const pin = randomPin();
    await this.emailChanges.save({ userId, newEmail, pin });
    await this.email.sendEmail(
      oldEmail,
      'Email change request',
      `your pin is: ${pin}`,
    );
  }

  async delete(userId: string, currentUserId: string): Promise<void> {
    // Case-insensitive self-guard — see update() for why a strict === is unsafe.
    if (userId.toLowerCase() === currentUserId.toLowerCase()) {
      throw new DeleteOwnUserException();
    }
    const user = await this.users.findById(userId);
    if (!user) throw new UserNotFoundException();
    const scrub = () => `deleted_${randomUUID()}`;
    user.firstName = scrub();
    user.lastName = scrub();
    user.email = scrub();
    user.deleted = true;
    await this.users.save(user);
  }

  countUserRoles(): Promise<CountByRoleResponse> {
    return this.users.countByRole();
  }

  async confirmNewEmail(
    req: ConfirmEmailRequest,
    principal: CurrentUserPrincipal,
  ): Promise<LoggedInUserResponse> {
    const user = await this.users.findByIdIncludingDeleted(principal.userId);
    if (!user) throw new UserNotFoundException();
    const pending = await this.emailChanges.findByUser(principal.userId);
    if (!pending || !pinsEqual(pending.pin, req.pin ?? '')) {
      throw new WrongEmailChangePinException();
    }

    user.email = pending.newEmail;
    await this.users.save(user);
    await this.emailChanges.deleteByUser(principal.userId);
    await this.invalidateRefreshToken(principal);
    return this.issueLogin(user);
  }

  /**
   * Public forgot-password. A missing user leaves silently — we return 204
   * without leaking whether the account exists.
   */
  async forgotPassword(req: ForgotPasswordRequest): Promise<void> {
    const email = req.email.trim().toLowerCase();
    const user = await this.users.findByEmail(email);
    if (!user) return;
    const token = this.tokens.generatePasswordResetToken(
      { email: user.email },
      false,
    );
    const frontendUrl = this.config.getOrThrow<AppConfig>('app').frontendUrl;
    await this.email.sendEmail(
      user.email,
      'Your Password Reset Token',
      ` To reset your password... Follow this link: ${frontendUrl}/reset-password?token=${token}`,
    );
  }

  /**
   * Public reset-password. The reset JWT (the field is named `refreshToken`)
   * carries the email. We validate the token fully here so an expired vs. forged
   * token surfaces the right error, then set the new password (marking the
   * account confirmed) and log the user in.
   */
  async resetPassword(req: ResetPasswordRequest): Promise<LoggedInUserResponse> {
    const details = this.tokens.decodeResetToken(req.refreshToken);
    if (!details.ok) {
      throw details.expired
        ? new ExpiredResetTokenException()
        : new WrongResetTokenException();
    }
    if (!details.resetPassword) {
      throw new WrongResetTokenException();
    }
    const user = await this.users.findByEmail(details.email);
    if (!user) throw new WrongResetTokenException();

    user.password = await bcrypt.hash(req.newPassword, 10);
    user.isConfirmed = true;
    await this.users.save(user);
    return this.issueLogin(user);
  }

  /** Issues a fresh access token + refresh row and stamps lastLogin. */
  private issueLogin(user: UserEntity): Promise<LoggedInUserResponse> {
    return this.issuer.issue(this.db.manager, user);
  }

  /**
   * Drops EVERY refresh token for the user, so a credential change (password /
   * email) logs out all sessions — the standard security expectation. We can't
   * scope this to the current session: a refreshed access token carries a new
   * session_id that no longer matches its stored refresh row.
   */
  private async invalidateRefreshToken(
    principal: CurrentUserPrincipal,
  ): Promise<void> {
    await this.refreshTokens.deleteByUser(principal.userId);
  }
}
