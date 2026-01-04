import nodemailer from 'nodemailer';
import { config } from '../config';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"Math Competition" <${config.email.user}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendVerificationCode(email: string, code: string, type: 'register' | 'reset'): Promise<void> {
    const subject = type === 'register'
      ? 'Verify your email - Math Competition'
      : 'Reset your password - Math Competition';

    const title = type === 'register'
      ? 'Email Verification'
      : 'Password Reset';

    const message = type === 'register'
      ? 'Use the following code to verify your email address and complete your registration:'
      : 'Use the following code to reset your password:';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">${title}</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                      Hi there,
                    </p>
                    <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #374151;">
                      ${message}
                    </p>

                    <!-- Verification Code -->
                    <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
                      <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1f2937;">${code}</span>
                    </div>

                    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                      This code will expire in <strong>10 minutes</strong>.
                    </p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                      If you didn't request this code, please ignore this email.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 40px; text-align: center; background-color: #f9fafb; border-radius: 0 0 16px 16px;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      Math Competition Platform
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject,
      html,
    });
  }
}

export const emailService = new EmailService();
