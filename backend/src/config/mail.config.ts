import { registerAs } from '@nestjs/config';

export interface MailConfig {
  /** SMTP host. Empty → email is logged instead of sent (dev / tests). */
  host: string;
  port: number;
  /** The `From` address (also the SMTP auth user). */
  username: string;
  password: string;
  /** `From` display name. */
  name: string;
  /** Implicit TLS on connect (SMTPS, usually :465) — Java `mail.smtp.ssl.enable`. */
  ssl: boolean;
  /** Upgrade a plain connection via STARTTLS — Java `mail.smtp.starttls.enable`. */
  starttls: boolean;
}

const asBool = (v: string | undefined): boolean => v === 'true';

/** All values come from the environment — see backend/.env. */
export default registerAs(
  'mail',
  (): MailConfig => ({
    host: process.env.MAIL_HOST!,
    port: parseInt(process.env.MAIL_PORT!, 10),
    username: process.env.MAIL_USERNAME!,
    password: process.env.MAIL_PASSWORD!,
    name: process.env.MAIL_NAME!,
    ssl: asBool(process.env.MAIL_SMTP_SSL),
    starttls: asBool(process.env.MAIL_SMTP_STARTTLS),
  }),
);
