import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailConfig } from '../../config/mail.config';

/**
 * SMTP email sender. Sends HTML mail via nodemailer, mapping the `mail.*`
 * config: `ssl` → implicit TLS, `starttls` → STARTTLS, and SMTP auth
 * only when a password is set.
 *
 * When `MAIL_HOST` is empty the send is LOGGED instead — so local dev without a
 * mail server (and the integration tests) work end to end without delivery.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter?: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {}

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    const cfg = this.config.getOrThrow<MailConfig>('mail');
    // No mail server configured (local dev / tests): log instead of delivering,
    // so the flows that send mail still complete end to end without SMTP.
    if (!cfg.host) {
      this.logger.log(`MAIL_HOST empty — skipping SMTP; would send "${subject}" to ${to}`);
      return;
    }
    await this.getTransporter(cfg).sendMail({
      from: { name: cfg.name, address: cfg.username },
      to,
      subject,
      html: body,
    });
  }

  /** Lazily built and reused (one transport per process). */
  private getTransporter(cfg: MailConfig): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.ssl,
        requireTLS: cfg.starttls,
        auth: cfg.password
          ? { user: cfg.username, pass: cfg.password }
          : undefined,
      });
    }
    return this.transporter;
  }
}
