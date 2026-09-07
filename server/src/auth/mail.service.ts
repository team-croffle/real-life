import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  /** @returns true if SMTP was skipped (development). */
  async sendEmailVerification(to: string, verifyUrl: string): Promise<boolean> {
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!user || !pass) {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new ServiceUnavailableException('Email sending is not configured');
      }
      this.logger.warn(`SMTP not set. Verification mail not sent.`);
      return true;
    }

    const host = this.config.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = Number(this.config.get<string>('SMTP_PORT', '587'));
    const from = this.config.get<string>('MAIL_FROM', user);

    const transport = createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transport.sendMail({
      from,
      to,
      subject: '이메일 인증',
      text: `아래 링크를 열어 가입을 완료하세요.\n${verifyUrl}`,
      html: `<p>아래 링크를 열어 가입을 완료하세요.</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
    });
    return false;
  }
}
