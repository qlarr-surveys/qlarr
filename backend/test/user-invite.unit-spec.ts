import { UsersService } from '../src/modules/users/users.service';

/**
 * Unit test for the invitation email built by UsersService.create — asserts the
 * body carries a real link to the reset-password page (the bug was a dangling
 * "set your password?token=..." with no URL). All collaborators are stubbed; no
 * DB or app boot.
 */
describe('UsersService — invitation email', () => {
  const FRONTEND = 'http://localhost:3000';
  const TOKEN = 'reset.jwt.token';

  const makeService = () => {
    const users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(null),
      create: jest.fn((e: unknown) => e),
      insert: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const tokens = { generatePasswordResetToken: jest.fn().mockReturnValue(TOKEN) };
    const email = { sendEmail: jest.fn().mockResolvedValue(undefined) };
    const config = { getOrThrow: jest.fn().mockReturnValue({ frontendUrl: FRONTEND }) };

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const service = new UsersService(
      {} as any, // db
      users as any,
      {} as any, // emailChanges
      {} as any, // refreshTokens
      email as any,
      tokens as any,
      {} as any, // issuer
      config as any,
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return { service, users, tokens, email };
  };

  it('emails a working set-password link to the reset-password page with the reset token', async () => {
    const { service, users, email, tokens } = makeService();

    await service.create({
      firstName: 'New',
      lastName: 'Bie',
      email: 'Newbie@X.com',
      roles: ['analyst'],
    });

    // New-user reset token minted for the normalized (lowercased) email,
    // against the stored placeholder hash (the token's single-use fingerprint).
    const inserted = users.insert.mock.calls[0][0] as { password: string };
    expect(tokens.generatePasswordResetToken).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'newbie@x.com',
        password: inserted.password,
      }),
      true,
    );

    expect(email.sendEmail).toHaveBeenCalledTimes(1);
    const [to, subject, body] = email.sendEmail.mock.calls[0] as [
      string,
      string,
      string,
    ];
    expect(to).toBe('newbie@x.com');
    expect(subject).toBe('Invitation to join Qlarr.com');
    // The fix: an absolute URL to the reset-password page carrying the token.
    expect(body).toContain(`${FRONTEND}/reset-password?token=${TOKEN}`);
    expect(body).toMatch(/https?:\/\/\S+\/reset-password\?token=\S+/);
  });

  it('rejects a duplicate email before inserting or emailing', async () => {
    const { service, users, email } = makeService();
    users.findByEmail.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create({
        firstName: 'New',
        lastName: 'Bie',
        email: 'newbie@x.com',
        roles: ['analyst'],
      }),
    ).rejects.toBeDefined();

    expect(users.insert).not.toHaveBeenCalled();
    expect(email.sendEmail).not.toHaveBeenCalled();
  });

  describe('resendInvitation', () => {
    it('rotates the placeholder password, then re-sends the link against the new hash', async () => {
      const { service, users, email, tokens } = makeService();
      const pending = {
        id: 'u1',
        email: 'newbie@x.com',
        password: 'old-placeholder-hash',
        isConfirmed: false,
      };
      users.findById.mockResolvedValue(pending);

      await service.resendInvitation('u1');

      // New hash saved before the token is minted from it — that's what voids
      // every earlier invitation link.
      expect(pending.password).not.toBe('old-placeholder-hash');
      expect(users.save).toHaveBeenCalledWith(pending);
      expect(users.save.mock.invocationCallOrder[0]).toBeLessThan(
        tokens.generatePasswordResetToken.mock.invocationCallOrder[0],
      );
      expect(tokens.generatePasswordResetToken).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newbie@x.com',
          password: pending.password,
        }),
        true,
      );
      expect(email.sendEmail).toHaveBeenCalledTimes(1);
      const [to, subject, body] = email.sendEmail.mock.calls[0] as [
        string,
        string,
        string,
      ];
      expect(to).toBe('newbie@x.com');
      expect(subject).toBe('Invitation to join Qlarr.com');
      expect(body).toContain(`${FRONTEND}/reset-password?token=${TOKEN}`);
    });

    it('refuses a user who already accepted', async () => {
      const { service, users, email } = makeService();
      users.findById.mockResolvedValue({
        id: 'u1',
        email: 'newbie@x.com',
        isConfirmed: true,
      });

      await expect(service.resendInvitation('u1')).rejects.toMatchObject({
        response: { error: 'UserAlreadyConfirmedException' },
      });
      // A real password must never be overwritten.
      expect(users.save).not.toHaveBeenCalled();
      expect(email.sendEmail).not.toHaveBeenCalled();
    });

    it('404s an unknown user', async () => {
      const { service, email } = makeService();

      await expect(service.resendInvitation('nope')).rejects.toMatchObject({
        response: { error: 'UserNotFoundException' },
      });
      expect(email.sendEmail).not.toHaveBeenCalled();
    });
  });
});
