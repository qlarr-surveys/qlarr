import * as jwt from 'jsonwebtoken';
import { TokenService } from '../src/auth/token.service';

/**
 * Unit test for the reset/invite token's single-use fingerprint: a token only
 * matches the password hash it was issued against.
 */
describe('TokenService — reset token password fingerprint', () => {
  const SECRET = 'lGYGGQSGHvq1lIw6Y3Ipy06H8SpSgHcARdPztZAS7Ug=';
  const config = {
    getOrThrow: jest.fn().mockReturnValue({
      secret: SECRET,
      resetExpirationMs: 3_600_000,
      resetExpirationForNewUsersMs: 3_600_000,
    }),
  };
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const tokens = new TokenService(config as any);

  const decode = (token: string) => {
    const details = tokens.decodeResetToken(token);
    if (!details.ok) throw new Error('token should decode');
    return details;
  };

  it('matches the password hash it was issued against', () => {
    const token = tokens.generatePasswordResetToken(
      { email: 'a@x.com', password: 'hash-1' },
      false,
    );
    const details = decode(token);
    expect(details.email).toBe('a@x.com');
    expect(
      tokens.resetTokenMatchesPassword(details.passwordFingerprint, 'hash-1'),
    ).toBe(true);
  });

  it('stops matching once the password hash changes', () => {
    const token = tokens.generatePasswordResetToken(
      { email: 'a@x.com', password: 'hash-1' },
      false,
    );
    expect(
      tokens.resetTokenMatchesPassword(decode(token).passwordFingerprint, 'hash-2'),
    ).toBe(false);
  });

  it('does not put the password hash itself in the readable claims', () => {
    const token = tokens.generatePasswordResetToken(
      { email: 'a@x.com', password: 'hash-1' },
      false,
    );
    expect(JSON.stringify(jwt.decode(token))).not.toContain('hash-1');
  });

  it('rejects a token issued without a fingerprint (pre-deploy links)', () => {
    const legacy = jwt.sign(
      { reset_password: true },
      Buffer.from(SECRET, 'base64'),
      { algorithm: 'HS256', subject: 'a@x.com', expiresIn: 3600 },
    );
    expect(
      tokens.resetTokenMatchesPassword(decode(legacy).passwordFingerprint, 'hash-1'),
    ).toBe(false);
  });
});
