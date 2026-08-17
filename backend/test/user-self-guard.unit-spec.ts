import { UsersService } from '../src/modules/users/users.service';
import {
  DeleteOwnUserException,
  EditOwnUserException,
  UserNotFoundException,
} from '../src/modules/users/user.exceptions';
import { EditUserRequest } from '../src/modules/users/user.dto';

/**
 * The self-edit / self-delete guard must compare UUIDs case-insensitively: the
 * path `userId` is raw (any case) while `currentUserId` is the lowercase JWT
 * claim, and Postgres `uuid` columns match case-insensitively — so a strict ===
 * would let a caller bypass the guard by uppercasing their own id.
 */
describe('UsersService self-guard — case-insensitive UUID compare', () => {
  const LOWER = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
  const UPPER = LOWER.toUpperCase();
  const OTHER = '11111111-1111-1111-1111-111111111111';

  const makeService = () => {
    const users = { findById: jest.fn().mockResolvedValue(null) };
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const service = new UsersService(
      {} as any, // db
      users as any,
      {} as any, // emailChanges
      {} as any, // refreshTokens
      {} as any, // email
      {} as any, // tokens
      {} as any, // issuer
      {} as any, // config
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return { service, users };
  };

  it('update: blocks editing your own account when the path id is uppercased', async () => {
    const { service } = makeService();
    await expect(
      service.update(UPPER, {} as EditUserRequest, LOWER),
    ).rejects.toBeInstanceOf(EditOwnUserException);
  });

  it('delete: blocks deleting your own account when the path id is uppercased', async () => {
    const { service } = makeService();
    await expect(service.delete(UPPER, LOWER)).rejects.toBeInstanceOf(
      DeleteOwnUserException,
    );
  });

  it('does not over-trigger — editing a different user passes the self-guard', async () => {
    const { service, users } = makeService();
    // Past the guard it hits findById (mocked → null) → a normal not-found.
    await expect(
      service.update(OTHER, {} as EditUserRequest, LOWER),
    ).rejects.toBeInstanceOf(UserNotFoundException);
    expect(users.findById).toHaveBeenCalledWith(OTHER);
  });
});
