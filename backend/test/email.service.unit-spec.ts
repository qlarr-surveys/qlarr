import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailConfig } from '../src/config/mail.config';
import { EmailService } from '../src/integrations/email/email.service';

jest.mock('nodemailer');

const BASE: MailConfig = {
  host: 'smtp.example.com',
  port: 587,
  username: 'postmaster@qlarr.com',
  password: 'secret',
  name: 'Qlarr',
  ssl: false,
  starttls: true,
};

const serviceWith = (cfg: MailConfig) => {
  const config = { getOrThrow: () => cfg } as unknown as ConfigService;
  return new EmailService(config);
};

describe('EmailService (nodemailer wiring)', () => {
  const sendMail = jest.fn().mockResolvedValue({ messageId: 'x' });
  const createTransport = nodemailer.createTransport as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    createTransport.mockReturnValue({ sendMail });
  });

  it('does not touch SMTP when MAIL_HOST is empty (logs instead)', async () => {
    await serviceWith({ ...BASE, host: '' }).sendEmail('a@b.com', 'Hi', '<p>x</p>');
    expect(createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('builds the transport from config and sends HTML with a named From', async () => {
    await serviceWith(BASE).sendEmail('to@x.com', 'Subject', '<b>body</b>');

    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: 'postmaster@qlarr.com', pass: 'secret' },
    });
    expect(sendMail).toHaveBeenCalledWith({
      from: { name: 'Qlarr', address: 'postmaster@qlarr.com' },
      to: 'to@x.com',
      subject: 'Subject',
      html: '<b>body</b>',
    });
  });

  it('omits SMTP auth when no password is configured', async () => {
    await serviceWith({ ...BASE, password: '' }).sendEmail('to@x.com', 's', 'b');
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ auth: undefined }),
    );
  });

  it('reuses a single transport across sends', async () => {
    const svc = serviceWith(BASE);
    await svc.sendEmail('to@x.com', 's', 'b');
    await svc.sendEmail('to2@x.com', 's2', 'b2');
    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });
});
