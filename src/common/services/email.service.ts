import { Injectable, Logger } from '@nestjs/common';
import { renderFile } from 'ejs';
import nodemailer, { type Transporter } from 'nodemailer';
import { existsSync } from 'fs';
import { join, resolve } from 'path';

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
  private readonly templatePath = this.resolveTemplatePath();
  private readonly fromEmail =
    process.env.MAIL_FROM_EMAIL ?? 'no-reply@example.com';
  private readonly fromName = process.env.MAIL_FROM_NAME ?? 'Lodging Platform';
  private readonly frontendVerifyUrl =
    process.env.MAIL_VERIFY_URL ?? 'http://localhost:3000/verify-email';
  private readonly frontendResetPasswordUrl =
    process.env.MAIL_RESET_PASSWORD_URL ??
    'http://localhost:3000/reset-password';
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
      subject: 'Xác minh email chủ tài khoản',
      preheader: `Hoàn tất xác minh email cho ${organizationName}.`,
      title: 'Xác minh email của bạn',
      greeting: `Xin chào ${organizationName},`,
      bodyParagraphs: [
        `Tài khoản chủ sở hữu cho ${organizationName} đã được tạo thành công.`,
        'Hãy xác minh email để hoàn tất kích hoạt và đảm bảo bạn nhận được các thông báo quan trọng từ hệ thống.',
      ],
      actionLabel: 'Xác minh email',
      actionUrl,
      secondaryText:
        'Liên kết này sẽ hết hạn sau 24 giờ. Nếu bạn không thực hiện yêu cầu này, bạn có thể bỏ qua email này.',
      footer:
        'Cần hỗ trợ? Hãy liên hệ đội vận hành để được hỗ trợ kích hoạt tài khoản.',
    });
  }

  async sendResetPasswordEmail(payload: ResetPasswordEmailPayload) {
    const actionUrl = this.buildActionUrl(
      this.frontendResetPasswordUrl,
      payload.token,
    );

    return this.sendTemplatedEmail(payload.email, {
      subject: 'Đặt lại mật khẩu tài khoản',
      preheader: 'Đặt lại mật khẩu cho tài khoản của bạn.',
      title: 'Đặt lại mật khẩu',
      greeting: 'Xin chào,',
      bodyParagraphs: [
        'Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.',
        'Bấm vào nút bên dưới để tạo mật khẩu mới và tiếp tục truy cập hệ thống một cách an toàn.',
      ],
      actionLabel: 'Tạo mật khẩu mới',
      actionUrl,
      secondaryText:
        'Liên kết này sẽ hết hạn sau 60 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy đổi mật khẩu ngay nếu nghi ngờ tài khoản bị truy cập.',
      footer:
        'Vì bảo mật, email này được gửi tự động và không cần phản hồi trực tiếp.',
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

  private resolveTemplatePath() {
    const templateRelativePath = 'common/email/templates/action-email.ejs';
    const candidatePaths = [
      join(__dirname, '../email/templates/action-email.ejs'),
      resolve(process.cwd(), 'src', templateRelativePath),
      resolve(process.cwd(), 'dist', 'src', templateRelativePath),
      resolve(process.cwd(), 'dist', templateRelativePath),
    ];

    const matchedPath = candidatePaths.find((candidatePath) =>
      existsSync(candidatePath),
    );

    if (matchedPath) {
      return matchedPath;
    }

    return candidatePaths[0];
  }
}
