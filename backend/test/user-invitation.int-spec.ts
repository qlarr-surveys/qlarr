import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { EmailService } from '../src/integrations/email/email.service';
import {
  ADMIN_USER_ID,
  bearer,
  seedUser,
  startTestApp,
  TestApp,
} from './harness';

const ADMIN_EMAIL = 'ada@acme.com';
const INVITEE = {
  firstName: 'New',
  lastName: 'Bie',
  email: 'newbie@acme.com',
  roles: ['analyst'],
};

/**
 * Invite → resend → accept, end to end against a real Postgres, using the
 * links from the emails actually sent: only the latest invitation link works,
 * each works once, and a pending invitee can't log in before accepting.
 */
describe('User invitations', () => {
  let ctx: TestApp;
  let root: DataSource;
  let app: INestApplication;

  beforeAll(async () => {
    ctx = await startTestApp();
    app = ctx.app;
    root = ctx.root;
    await seedUser(root, {
      id: ADMIN_USER_ID,
      email: ADMIN_EMAIL,
      password: 'admin password',
      roles: ['SUPER_ADMIN'],
    });
  }, 180_000);

  afterAll(async () => {
    await ctx?.close();
  });

  const server = () => app.getHttpServer();
  const admin = () => bearer({ email: ADMIN_EMAIL });

  /** Runs `action` and returns the token from the one email it sent. */
  const emailedToken = async (action: () => Promise<unknown>) => {
    const send = jest.spyOn(app.get(EmailService), 'sendEmail');
    try {
      await action();
      expect(send).toHaveBeenCalledTimes(1);
      return /token=(\S+)/.exec(send.mock.calls[0][2])![1];
    } finally {
      send.mockRestore();
    }
  };

  const invite = () =>
    emailedToken(() =>
      request(server())
        .post('/user/create')
        .set('Authorization', admin())
        .send(INVITEE)
        .expect(201),
    );

  const resend = (userId: string) =>
    emailedToken(() =>
      request(server())
        .post(`/user/${userId}/resend_invitation`)
        .set('Authorization', admin())
        .expect(204),
    );

  const accept = (token: string, newPassword = 'invitee password') =>
    request(server())
      .post('/user/reset_password')
      .send({ refreshToken: token, newPassword });

  const pendingUserId = async (): Promise<string> => {
    const rows = await root.query(
      `SELECT id FROM users WHERE email = $1 AND deleted = false`,
      [INVITEE.email],
    );
    return rows[0].id;
  };

  const deleteUser = (userId: string) =>
    request(server())
      .delete(`/user/${userId}`)
      .set('Authorization', admin())
      .expect(204);

  it('lets an admin delete a pending invitee and invite the same email again', async () => {
    await invite();
    await deleteUser(await pendingUserId());
    await invite();
    await deleteUser(await pendingUserId());
  });

  it('blocks login for a pending invitee, including with the old predictable placeholder', async () => {
    await invite();
    const userId = await pendingUserId();
    await request(server())
      .post('/user/login')
      .send({ email: INVITEE.email, password: 'NewUpdateMeBie' })
      .expect(401);
    await deleteUser(userId);
  });

  it('voids earlier invitation links on resend; the latest works exactly once', async () => {
    const first = await invite();
    const userId = await pendingUserId();
    const second = await resend(userId);
    const third = await resend(userId);

    await accept(first).expect(401);
    await accept(second).expect(401);
    const res = await accept(third).expect(200);
    expect(res.body.email).toBe(INVITEE.email);
    await accept(third, 'replayed password').expect(401);

    // Accepted: confirmed, and the chosen password logs in.
    const rows = await root.query(
      `SELECT is_confirmed FROM users WHERE id = $1`,
      [userId],
    );
    expect(rows[0].is_confirmed).toBe(true);
    await request(server())
      .post('/user/login')
      .send({ email: INVITEE.email, password: 'invitee password' })
      .expect(200);
  });

  it('refuses to resend to a user who already accepted (and keeps their password)', async () => {
    const userId = await pendingUserId();
    await request(server())
      .post(`/user/${userId}/resend_invitation`)
      .set('Authorization', admin())
      .expect(400)
      .expect((res) => expect(res.body.error).toBe('UserAlreadyConfirmedException'));
    await request(server())
      .post('/user/login')
      .send({ email: INVITEE.email, password: 'invitee password' })
      .expect(200);
  });

  it('404s a resend for an unknown user', () =>
    request(server())
      .post('/user/cccccccc-cccc-cccc-cccc-cccccccccccc/resend_invitation')
      .set('Authorization', admin())
      .expect(404));

  it('forbids a resend by a non super admin', async () =>
    request(server())
      .post(`/user/${await pendingUserId()}/resend_invitation`)
      .set('Authorization', bearer({ authorities: ['survey_admin'] }))
      .expect(403));
});
