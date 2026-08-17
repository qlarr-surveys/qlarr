import { UsersService } from '../src/modules/users/users.service';

/**
 * confirmNewEmail validates the PIN, saves the user's new email, consumes the
 * pending change and logs the user in. If the save fails, the pending change is
 * left intact (not consumed) so the user can retry.
 */
describe('UsersService.confirmNewEmail', () => {
  const OLD = 'old@x.com';
  const NEW = 'new@x.com';
  const PIN = '123456';
  const principal = { userId: 'u1' } as never;

  const makeService = (save: jest.Mock) => {
    const db = { manager: {} };
    const users = {
      findByIdIncludingDeleted: jest.fn().mockResolvedValue({ id: 'u1', email: OLD }),
      save,
    };
    const emailChanges = {
      findByUser: jest.fn().mockResolvedValue({ newEmail: NEW, pin: PIN }),
      deleteByUser: jest.fn().mockResolvedValue(undefined),
    };
    const refreshTokens = { deleteByUser: jest.fn().mockResolvedValue(undefined) };
    const issuer = { issue: jest.fn().mockResolvedValue({ accessToken: 'a' }) };
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const service = new UsersService(
      db as any,
      users as any,
      emailChanges as any,
      refreshTokens as any,
      {} as any, // email
      {} as any, // tokens
      issuer as any,
      {} as any, // config
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return { service, users, emailChanges, issuer };
  };

  it('happy path: saves the new email, consumes the pending change, logs in', async () => {
    const { service, users, emailChanges, issuer } = makeService(
      jest.fn().mockResolvedValue({ id: 'u1', email: NEW }),
    );

    await service.confirmNewEmail({ pin: PIN }, principal);

    expect(users.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'u1', email: NEW }),
    );
    expect(emailChanges.deleteByUser).toHaveBeenCalledWith('u1');
    expect(issuer.issue).toHaveBeenCalledTimes(1);
  });

  it('does not consume the pending change when the save fails', async () => {
    const { service, emailChanges } = makeService(
      jest.fn().mockRejectedValue(new Error('save failed')),
    );

    await expect(service.confirmNewEmail({ pin: PIN }, principal)).rejects.toThrow(
      'save failed',
    );
    expect(emailChanges.deleteByUser).not.toHaveBeenCalled();
  });
});
