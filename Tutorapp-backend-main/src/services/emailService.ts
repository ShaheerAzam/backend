import nodemailer from "nodemailer";
import { logger } from "../utils/logger";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface WelcomeEmailData {
  email: string;
  name: string;
  role: "tutor" | "student";
  tempPassword: string;
  dashboardUrl: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const config: EmailConfig = {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || "muhammadshaheer645@gmail.com",
        pass: process.env.SMTP_PASS || "tpvf isgx wppp ituh",
      },
    };

    this.transporter = nodemailer.createTransport(config);
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
    try {
      const subject = `Welcome to Ebbas Mattehjelp - Your ${data.role} account is ready!`;
      const htmlContent = this.generateWelcomeEmailHtml(data);

      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || "noreply@ebbasmattehjelp.com",
        to: data.email,
        subject,
        html: htmlContent,
      });

      logger.info(`Welcome email sent to ${data.role}: ${data.email}`);
    } catch (error) {
      logger.error(`Failed to send welcome email to ${data.email}:`, error);
      throw new Error("Failed to send welcome email");
    }
  }

  private generateWelcomeEmailHtml(data: WelcomeEmailData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Ebbas Mattehjelp</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }
            .content { padding: 20px 0; }
            .credentials { background: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Ebbas Mattehjelp!</h1>
              <p>Your ${data.role} account has been created</p>
            </div>
            
            <div class="content">
              <p>Hello ${data.name},</p>
              
              <p>Welcome to Ebbas Mattehjelp! Your ${data.role} account has been successfully created by our admin team.</p>
              
              <div class="credentials">
                <h3>Your Login Credentials:</h3>
                <p><strong>Email:</strong> ${data.email}</p>
                <p><strong>Temporary Password:</strong> ${data.tempPassword}</p>
              </div>
              
              <p><strong>Important:</strong> For security reasons, you will be required to change your password on your first login.</p>
              
              <p>
                <a href="${data.dashboardUrl}" class="button">Access Your Dashboard</a>
              </p>
              
              <p>If you have any questions or need assistance, please contact our admin team.</p>
              
              <p>Best regards,<br>The Ebbas Mattehjelp Team</p>
            </div>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info("Email service connection verified");
      return true;
    } catch (error) {
      logger.error("Email service connection failed:", error);
      return false;
    }
  }
}
