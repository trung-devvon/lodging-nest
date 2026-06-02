import { Injectable, Logger } from '@nestjs/common';
import { renderFile } from 'ejs';
import nodemailer, { type Transporter } from 'nodemailer';
import { join } from 'path';

interface EmailTemplatePayload {
  actionLabel: string;
  actionUrl: string;
  bodyParagraphs: string[];
  footer: string;
  greeting: string;
  preheader: string;
  secondaryText: string;
  subject: string;
  title: string;
}

interface VerificationEmailPayload {
  email: string;
  organizationName: string;
  token: string;
}

interface ResetPasswordEmailPayload {
  email: string;
  token: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly templatePath = join(
    __dirname,
    '../email/templates/action-email.ejs',
  );
  private readonly fromEmail =
    process.env.MAIL_FROM_EMAIL ?? 'no-reply@example.com';
  private readonly fromName = process.env.MAIL_FROM_NAME ?? 'Lodging Platform';
  private readonly frontendVerifyUrl =
    process.env.MAIL_VERIFY_URL ?? 'http://localhost:5173/verify-email';
  private readonly frontendResetPasswordUrl =
    process.env.MAIL_RESET_PASSWORD_URL ??
    'http://localhost:5173/reset-password';
  private readonly mailConfigured = Boolean(process.env.SMTP_HOST);

  constructor() {
    if (this.mailConfigured) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: this.parseBoolean(process.env.SMTP_SECURE),
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            }
          : undefined,
      });
      return;
    }

    this.transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    this.logger.warn(
      'SMTP_HOST is not configured. Emails will be captured in logs only.',
    );
  }

  async sendVerificationEmail(payload: VerificationEmailPayload) {
    const organizationName = payload.organizationName.trim();
    const actionUrl = this.buildActionUrl(
      this.frontendVerifyUrl,
      payload.token,
    );

    return this.sendTemplatedEmail(payload.email, {
      subject: 'Xac minh email chu tai khoan',
      preheader: `Hoan tat xac minh email cho ${organizationName}.`,
      title: 'Xac minh email cua ban',
      greeting: `Xin chao ${organizationName},`,
      bodyParagraphs: [
        `Tai khoan chu so huu cho ${organizationName} da duoc tao thanh cong.`,
        'Hay xac minh email de hoan tat kich hoat va dam bao ban nhan duoc cac thong bao quan trong tu he thong.',
      ],
      actionLabel: 'Xac minh email',
      actionUrl,
      secondaryText:
        'Lien ket nay se het han sau 24 gio. Neu ban khong thuc hien yeu cau nay, ban co the bo qua email nay.',
      footer:
        'Can ho tro? Hay lien he doi van hanh de duoc ho tro kich hoat tai khoan.',
    });
  }

  async sendResetPasswordEmail(payload: ResetPasswordEmailPayload) {
    const actionUrl = this.buildActionUrl(
      this.frontendResetPasswordUrl,
      payload.token,
    );

    return this.sendTemplatedEmail(payload.email, {
      subject: 'Dat lai mat khau tai khoan',
      preheader: 'Dat lai mat khau cho tai khoan cua ban.',
      title: 'Dat lai mat khau',
      greeting: 'Xin chao,',
      bodyParagraphs: [
        'Chung toi da nhan duoc yeu cau dat lai mat khau cho tai khoan cua ban.',
        'Bam vao nut ben duoi de tao mat khau moi va tiep tuc truy cap he thong mot cach an toan.',
      ],
      actionLabel: 'Tao mat khau moi',
      actionUrl,
      secondaryText:
        'Lien ket nay se het han sau 60 phut. Neu ban khong yeu cau dat lai mat khau, hay doi mat khau ngay neu nghi ngo tai khoan bi truy cap.',
      footer:
        'Vi bao mat, email nay duoc gui tu dong va khong can phan hoi truc tiep.',
    });
  }

  private async sendTemplatedEmail(
    recipientEmail: string,
    payload: EmailTemplatePayload,
  ) {
    const html = await renderFile(this.templatePath, {
      brandName: this.fromName,
      ...payload,
    });
    const text = this.renderPlainText(payload);

    const info = await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: recipientEmail,
      subject: payload.subject,
      html,
      text,
    });

    if (!this.mailConfigured) {
      this.logger.log(
        `Captured email for ${recipientEmail}: ${payload.subject} (${info.messageId})`,
      );
    }
  }

  private renderPlainText(payload: EmailTemplatePayload) {
    return [
      payload.title,
      '',
      payload.greeting,
      '',
      ...payload.bodyParagraphs,
      '',
      `${payload.actionLabel}: ${payload.actionUrl}`,
      '',
      payload.secondaryText,
      '',
      payload.footer,
    ].join('\n');
  }

  private buildActionUrl(baseUrl: string, token: string) {
    try {
      const url = new URL(baseUrl);
      url.searchParams.set('token', token);
      return url.toString();
    } catch {
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
    }
  }

  private parseBoolean(value?: string) {
    return value?.toLowerCase() === 'true';
  }
}
