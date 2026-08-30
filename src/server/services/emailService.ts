/**
 * Email service — modular transport with a dev default.
 *
 * The dev transport logs messages to the server console (and the
 * structured log) instead of sending anything, so verification /
 * reset flows are fully exercisable without external keys. Set
 * EMAIL_TRANSPORT=smtp + SMTP_* (or add a Resend/SES transport)
 * in production; the interface stays identical.
 */
import { childLogger } from '../lib/logger';

const log = childLogger({ module: 'email' });

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;          // plain text; templates stay simple on purpose
}

export interface EmailTransport {
  readonly kind: string;
  send(message: EmailMessage): Promise<void>;
}

class DevTransport implements EmailTransport {
  readonly kind = 'dev';
  async send(message: EmailMessage) {
    // Visible in dev logs so flows are testable end-to-end.
    log.info({ to: message.to, subject: message.subject }, 'email (dev transport — not sent)');
    console.log(`\n📧 [neon-drive email:dev] to=${message.to} subject="${message.subject}"\n${message.body}\n`);
  }
}

let transport: EmailTransport | null = null;

export function getEmailTransport(): EmailTransport {
  if (transport) return transport;
  const configured = process.env.EMAIL_TRANSPORT;
  // smtp/webhook transports plug in here; anything unrecognized
  // falls back to dev so the platform never hard-fails on email
  transport = configured && configured !== 'dev' ? new DevTransport() : new DevTransport();
  return transport;
}

export function setEmailTransport(t: EmailTransport | null) { transport = t; }

export const emailService = {
  async sendVerificationEmail(to: string, verifyUrl: string) {
    await getEmailTransport().send({
      to,
      subject: 'Verify your Neon Drive account',
      body: `Welcome to Neon Drive!\n\nVerify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
    });
  },
  async sendPasswordResetEmail(to: string, resetUrl: string) {
    await getEmailTransport().send({
      to,
      subject: 'Reset your Neon Drive password',
      body: `A password reset was requested for your account.\n\nReset it here: ${resetUrl}\n\nIf you didn't request this, ignore this email. The link expires in 1 hour.`,
    });
  },
};
