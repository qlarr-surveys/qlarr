import { UsersService } from '../src/modules/users/users.service';

/**
 * Unit test for the invitation email built by UsersService.create — asserts the
 * body carries a real link to the reset-password page (the bug was a dangling
 * "set your password?token=..." with no URL). All collaborators are stubbed; no
 * DB or app boot.
 */
describe('UsersService.create — invitation email', () => {
  const FRONTEND = 'http://localhost:3000';
  const TOKEN = 'reset.jwt.token';

  const makeService = () => {
    const users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn((e: unknown) => e),
      insert: jest.fn().mockResolvedValue(undefined),
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
    const { service, email, tokens } = makeService();

    await service.create({
      firstName: 'New',
      lastName: 'Bie',
      email: 'Newbie@X.com',
      roles: ['analyst'],
    });

    // New-user reset token minted for the normalized (lowercased) email.
    expect(tokens.generatePasswordResetToken).toHaveBeenCalledWith(
      { email: 'newbie@x.com' },
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
});
