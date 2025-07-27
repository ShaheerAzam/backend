import nodemailer from "nodemailer";
import { logger } from "../utils/logger";
import { format } from "date-fns";

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

interface LessonAssignmentData {
  tutorEmail: string;
  tutorName: string;
  studentEmail: string;
  studentName: string;
  lessonDate: Date;
  lessonTime: string;
  duration: number;
  level: string;
  topic: string;
  type: "online" | "in-person";
  location?: string;
  dashboardUrl: string;
}

interface LessonRescheduleData {
  tutorEmail: string;
  tutorName: string;
  studentEmail: string;
  studentName: string;
  oldDate: Date;
  oldTime: string;
  newDate: Date;
  newTime: string;
  duration: number;
  level: string;
  topic: string;
  type: "online" | "in-person";
  location?: string;
  rescheduledBy: "tutor" | "admin";
  dashboardUrl: string;
}

interface LessonCancellationData {
  tutorEmail: string;
  tutorName: string;
  studentEmail: string;
  studentName: string;
  lessonDate: Date;
  lessonTime: string;
  duration: number;
  level: string;
  topic: string;
  cancelledBy: "tutor" | "student" | "admin";
  reason?: string;
  tutorPaid: boolean;
  dashboardUrl: string;
}

interface LessonCompletionData {
  tutorEmail: string;
  tutorName: string;
  studentEmail: string;
  studentName: string;
  lessonDate: Date;
  lessonTime: string;
  duration: number;
  level: string;
  topic: string;
  dashboardUrl: string;
}

interface PaymentApprovalData {
  tutorEmail: string;
  tutorName: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  totalAmount: number;
  decision: "approved" | "rejected";
  dashboardUrl: string;
}

interface PasswordResetData {
  email: string;
  name: string;
  resetLink: string;
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

  async sendLessonAssignmentEmail(data: LessonAssignmentData): Promise<void> {
    try {
      const subject = `New Lesson Assigned - ${format(data.lessonDate, 'MMM dd, yyyy')} at ${data.lessonTime}`;

      // Send to tutor
      const tutorHtml = this.generateLessonAssignmentTutorHtml(data);
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || "noreply@ebbasmattehjelp.com",
        to: data.tutorEmail,
        subject,
        html: tutorHtml,
      });

      // Send to student
      const studentHtml = this.generateLessonAssignmentStudentHtml(data);
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || "noreply@ebbasmattehjelp.com",
        to: data.studentEmail,
        subject,
        html: studentHtml,
      });

      logger.info(`Lesson assignment emails sent for lesson on ${format(data.lessonDate, 'yyyy-MM-dd')} at ${data.lessonTime}`);
    } catch (error) {
      logger.error(`Failed to send lesson assignment emails:`, error);
      throw new Error("Failed to send lesson assignment emails");
    }
  }

  async sendLessonRescheduleEmail(data: LessonRescheduleData): Promise<void> {
    try {
      const subject = `Lesson Rescheduled - ${format(data.newDate, 'MMM dd, yyyy')} at ${data.newTime}`;

      // Send to tutor
      const tutorHtml = this.generateLessonRescheduleTutorHtml(data);
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || "noreply@ebbasmattehjelp.com",
        to: data.tutorEmail,
        subject,
        html: tutorHtml,
      });

      // Send to student
      const studentHtml = this.generateLessonRescheduleStudentHtml(data);
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || "noreply@ebbasmattehjelp.com",
        to: data.studentEmail,
        subject,
        html: studentHtml,
      });

      logger.info(`Lesson reschedule emails sent for lesson rescheduled to ${format(data.newDate, 'yyyy-MM-dd')} at ${data.newTime}`);
    } catch (error) {
      logger.error(`Failed to send lesson reschedule emails:`, error);
      throw new Error("Failed to send lesson reschedule emails");
    }
  }

  async sendLessonCancellationEmail(data: LessonCancellationData): Promise<void> {
    try {
      const subject = `Lesson Cancelled - ${format(data.lessonDate, 'MMM dd, yyyy')} at ${data.lessonTime}`;

      // Send to tutor
      const tutorHtml = this.generateLessonCancellationTutorHtml(data);
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || "noreply@ebbasmattehjelp.com",
        to: data.tutorEmail,
        subject,
        html: tutorHtml,
      });

      // Send to student
      const studentHtml = this.generateLessonCancellationStudentHtml(data);
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || "noreply@ebbasmattehjelp.com",
        to: data.studentEmail,
        subject,
        html: studentHtml,
      });

      logger.info(`Lesson cancellation emails sent for lesson on ${format(data.lessonDate, 'yyyy-MM-dd')} at ${data.lessonTime}`);
    } catch (error) {
      logger.error(`Failed to send lesson cancellation emails:`, error);
      throw new Error("Failed to send lesson cancellation emails");
    }
  }

  async sendLessonCompletionEmail(data: LessonCompletionData): Promise<void> {
    try {
      const subject = `Lesson Completed - ${format(data.lessonDate, 'MMM dd, yyyy')} at ${data.lessonTime}`;

      // Send to tutor
      const tutorHtml = this.generateLessonCompletionTutorHtml(data);
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || "noreply@ebbasmattehjelp.com",
        to: data.tutorEmail,
        subject,
        html: tutorHtml,
      });

      // Send to student
      const studentHtml = this.generateLessonCompletionStudentHtml(data);
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || "noreply@ebbasmattehjelp.com",
        to: data.studentEmail,
        subject,
        html: studentHtml,
      });

      logger.info(`Lesson completion emails sent for lesson on ${format(data.lessonDate, 'yyyy-MM-dd')} at ${data.lessonTime}`);
    } catch (error) {
      logger.error(`Failed to send lesson completion emails:`, error);
      throw new Error("Failed to send lesson completion emails");
    }
  }

  async sendPaymentApprovalEmail(data: PaymentApprovalData): Promise<void> {
    try {
      const subject = `Payment ${data.decision === 'approved' ? 'Approved' : 'Rejected'} - Period ${data.periodStart} to ${data.periodEnd}`;
      const htmlContent = this.generatePaymentApprovalHtml(data);

      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || "noreply@ebbasmattehjelp.com",
        to: data.tutorEmail,
        subject,
        html: htmlContent,
      });

      logger.info(`Payment ${data.decision} email sent to tutor: ${data.tutorEmail}`);
    } catch (error) {
      logger.error(`Failed to send payment ${data.decision} email to ${data.tutorEmail}:`, error);
      throw new Error(`Failed to send payment ${data.decision} email`);
    }
  }

  async sendPasswordResetEmail(data: PasswordResetData): Promise<void> {
    try {
      const subject = `Password Reset Request - Ebbas Mattehjelp`;
      const htmlContent = this.generatePasswordResetHtml(data);

      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || "noreply@ebbasmattehjelp.com",
        to: data.email,
        subject,
        html: htmlContent,
      });

      logger.info(`Password reset email sent to ${data.email}`);
    } catch (error) {
      logger.error(`Failed to send password reset email to ${data.email}:`, error);
      throw new Error("Failed to send password reset email");
    }
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
              
              <p><strong>Important:</strong> For security reasons, you are requested to change your password on your first login.</p>
              
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

  private generateLessonAssignmentTutorHtml(data: LessonAssignmentData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New Lesson Assignment</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #e3f2fd; padding: 20px; text-align: center; border-radius: 8px; }
            .content { padding: 20px 0; }
            .lesson-details { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Lesson Assignment</h1>
              <p>You have been assigned a new lesson</p>
            </div>
            
            <div class="content">
              <p>Hello ${data.tutorName},</p>
              
              <p>You have been assigned a new lesson with student <strong>${data.studentName}</strong>.</p>
              
              <div class="lesson-details">
                <h3>Lesson Details:</h3>
                <p><strong>Date:</strong> ${format(data.lessonDate, 'EEEE, MMMM dd, yyyy')}</p>
                <p><strong>Time:</strong> ${data.lessonTime}</p>
                <p><strong>Duration:</strong> ${data.duration} minutes</p>
                <p><strong>Level:</strong> ${data.level}</p>
                <p><strong>Topic:</strong> ${data.topic}</p>
                <p><strong>Type:</strong> ${data.type === 'online' ? 'Online' : 'In-Person'}</p>
                ${data.location ? `<p><strong>Location:</strong> ${data.location}</p>` : ''}
              </div>
              
              <p>
                <a href="${data.dashboardUrl}" class="button">View Lesson Details</a>
              </p>
              
              <p>Please prepare for this lesson and ensure you're available at the scheduled time.</p>
              
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

  private generateLessonAssignmentStudentHtml(data: LessonAssignmentData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>New Lesson Scheduled</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #e8f5e8; padding: 20px; text-align: center; border-radius: 8px; }
            .content { padding: 20px 0; }
            .lesson-details { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Lesson Scheduled</h1>
              <p>Your lesson has been successfully scheduled</p>
            </div>
            
            <div class="content">
              <p>Hello ${data.studentName},</p>
              
              <p>Your lesson with tutor <strong>${data.tutorName}</strong> has been successfully scheduled.</p>
              
              <div class="lesson-details">
                <h3>Lesson Details:</h3>
                <p><strong>Date:</strong> ${format(data.lessonDate, 'EEEE, MMMM dd, yyyy')}</p>
                <p><strong>Time:</strong> ${data.lessonTime}</p>
                <p><strong>Duration:</strong> ${data.duration} minutes</p>
                <p><strong>Level:</strong> ${data.level}</p>
                <p><strong>Topic:</strong> ${data.topic}</p>
                <p><strong>Type:</strong> ${data.type === 'online' ? 'Online' : 'In-Person'}</p>
                ${data.location ? `<p><strong>Location:</strong> ${data.location}</p>` : ''}
              </div>
              
              <p>
                <a href="${data.dashboardUrl}" class="button">View Lesson Details</a>
              </p>
              
              <p>Please make sure to be ready for your lesson at the scheduled time.</p>
              
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

  private generateLessonRescheduleTutorHtml(data: LessonRescheduleData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Lesson Rescheduled</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #fff3cd; padding: 20px; text-align: center; border-radius: 8px; }
            .content { padding: 20px 0; }
            .lesson-details { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .change-details { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; background: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Lesson Rescheduled</h1>
              <p>Your lesson has been rescheduled</p>
            </div>
            
            <div class="content">
              <p>Hello ${data.tutorName},</p>
              
              <p>Your lesson with student <strong>${data.studentName}</strong> has been rescheduled.</p>
              
              <div class="change-details">
                <h3>Schedule Change:</h3>
                <p><strong>From:</strong> ${format(data.oldDate, 'EEEE, MMMM dd, yyyy')} at ${data.oldTime}</p>
                <p><strong>To:</strong> ${format(data.newDate, 'EEEE, MMMM dd, yyyy')} at ${data.newTime}</p>
                <p><strong>Rescheduled by:</strong> ${data.rescheduledBy === 'admin' ? 'Admin' : 'Tutor'}</p>
              </div>
              
              <div class="lesson-details">
                <h3>Updated Lesson Details:</h3>
                <p><strong>Date:</strong> ${format(data.newDate, 'EEEE, MMMM dd, yyyy')}</p>
                <p><strong>Time:</strong> ${data.newTime}</p>
                <p><strong>Duration:</strong> ${data.duration} minutes</p>
                <p><strong>Level:</strong> ${data.level}</p>
                <p><strong>Topic:</strong> ${data.topic}</p>
                <p><strong>Type:</strong> ${data.type === 'online' ? 'Online' : 'In-Person'}</p>
                ${data.location ? `<p><strong>Location:</strong> ${data.location}</p>` : ''}
              </div>
              
              <p>
                <a href="${data.dashboardUrl}" class="button">View Updated Lesson</a>
              </p>
              
              <p>Please update your schedule accordingly.</p>
              
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

  private generateLessonRescheduleStudentHtml(data: LessonRescheduleData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Lesson Rescheduled</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #fff3cd; padding: 20px; text-align: center; border-radius: 8px; }
            .content { padding: 20px 0; }
            .lesson-details { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .change-details { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; background: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Lesson Rescheduled</h1>
              <p>Your lesson has been rescheduled</p>
            </div>
            
            <div class="content">
              <p>Hello ${data.studentName},</p>
              
              <p>Your lesson with tutor <strong>${data.tutorName}</strong> has been rescheduled.</p>
              
              <div class="change-details">
                <h3>Schedule Change:</h3>
                <p><strong>From:</strong> ${format(data.oldDate, 'EEEE, MMMM dd, yyyy')} at ${data.oldTime}</p>
                <p><strong>To:</strong> ${format(data.newDate, 'EEEE, MMMM dd, yyyy')} at ${data.newTime}</p>
                <p><strong>Rescheduled by:</strong> ${data.rescheduledBy === 'admin' ? 'Admin' : 'Tutor'}</p>
              </div>
              
              <div class="lesson-details">
                <h3>Updated Lesson Details:</h3>
                <p><strong>Date:</strong> ${format(data.newDate, 'EEEE, MMMM dd, yyyy')}</p>
                <p><strong>Time:</strong> ${data.newTime}</p>
                <p><strong>Duration:</strong> ${data.duration} minutes</p>
                <p><strong>Level:</strong> ${data.level}</p>
                <p><strong>Topic:</strong> ${data.topic}</p>
                <p><strong>Type:</strong> ${data.type === 'online' ? 'Online' : 'In-Person'}</p>
                ${data.location ? `<p><strong>Location:</strong> ${data.location}</p>` : ''}
              </div>
              
              <p>
                <a href="${data.dashboardUrl}" class="button">View Updated Lesson</a>
              </p>
              
              <p>Please update your schedule accordingly.</p>
              
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

  private generateLessonCancellationTutorHtml(data: LessonCancellationData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Lesson Cancelled</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8d7da; padding: 20px; text-align: center; border-radius: 8px; }
            .content { padding: 20px 0; }
            .lesson-details { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .cancellation-info { background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Lesson Cancelled</h1>
              <p>Your lesson has been cancelled</p>
            </div>
            
            <div class="content">
              <p>Hello ${data.tutorName},</p>
              
              <p>Your lesson with student <strong>${data.studentName}</strong> has been cancelled.</p>
              
              <div class="cancellation-info">
                <h3>Cancellation Details:</h3>
                <p><strong>Cancelled by:</strong> ${data.cancelledBy === 'admin' ? 'Admin' : data.cancelledBy === 'tutor' ? 'Tutor' : 'Student'}</p>
                ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
                ${data.tutorPaid ? '<p><strong>Note:</strong> You will be paid for this lesson due to late cancellation.</p>' : ''}
              </div>
              
              <div class="lesson-details">
                <h3>Cancelled Lesson Details:</h3>
                <p><strong>Date:</strong> ${format(data.lessonDate, 'EEEE, MMMM dd, yyyy')}</p>
                <p><strong>Time:</strong> ${data.lessonTime}</p>
                <p><strong>Duration:</strong> ${data.duration} minutes</p>
                <p><strong>Level:</strong> ${data.level}</p>
                <p><strong>Topic:</strong> ${data.topic}</p>
              </div>
              
              <p>
                <a href="${data.dashboardUrl}" class="button">View Lesson Details</a>
              </p>
              
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

  private generateLessonCancellationStudentHtml(data: LessonCancellationData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Lesson Cancelled</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8d7da; padding: 20px; text-align: center; border-radius: 8px; }
            .content { padding: 20px 0; }
            .lesson-details { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .cancellation-info { background: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Lesson Cancelled</h1>
              <p>Your lesson has been cancelled</p>
            </div>
            
            <div class="content">
              <p>Hello ${data.studentName},</p>
              
              <p>Your lesson with tutor <strong>${data.tutorName}</strong> has been cancelled.</p>
              
              <div class="cancellation-info">
                <h3>Cancellation Details:</h3>
                <p><strong>Cancelled by:</strong> ${data.cancelledBy === 'admin' ? 'Admin' : data.cancelledBy === 'tutor' ? 'Tutor' : 'Student'}</p>
                ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
              </div>
              
              <div class="lesson-details">
                <h3>Cancelled Lesson Details:</h3>
                <p><strong>Date:</strong> ${format(data.lessonDate, 'EEEE, MMMM dd, yyyy')}</p>
                <p><strong>Time:</strong> ${data.lessonTime}</p>
                <p><strong>Duration:</strong> ${data.duration} minutes</p>
                <p><strong>Level:</strong> ${data.level}</p>
                <p><strong>Topic:</strong> ${data.topic}</p>
              </div>
              
              <p>
                <a href="${data.dashboardUrl}" class="button">View Lesson Details</a>
              </p>
              
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

  private generateLessonCompletionTutorHtml(data: LessonCompletionData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Lesson Completed</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #d4edda; padding: 20px; text-align: center; border-radius: 8px; }
            .content { padding: 20px 0; }
            .lesson-details { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Lesson Completed</h1>
              <p>Great job! Your lesson has been marked as completed</p>
            </div>
            
            <div class="content">
              <p>Hello ${data.tutorName},</p>
              
              <p>Your lesson with student <strong>${data.studentName}</strong> has been successfully completed.</p>
              
              <div class="lesson-details">
                <h3>Completed Lesson Details:</h3>
                <p><strong>Date:</strong> ${format(data.lessonDate, 'EEEE, MMMM dd, yyyy')}</p>
                <p><strong>Time:</strong> ${data.lessonTime}</p>
                <p><strong>Duration:</strong> ${data.duration} minutes</p>
                <p><strong>Level:</strong> ${data.level}</p>
                <p><strong>Topic:</strong> ${data.topic}</p>
              </div>
              
              <p>
                <a href="${data.dashboardUrl}" class="button">View Lesson Details</a>
              </p>
              
              <p>Thank you for your excellent work! This lesson will be included in your next earnings calculation.</p>
              
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

  private generateLessonCompletionStudentHtml(data: LessonCompletionData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Lesson Completed</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #d4edda; padding: 20px; text-align: center; border-radius: 8px; }
            .content { padding: 20px 0; }
            .lesson-details { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Lesson Completed</h1>
              <p>Your lesson has been completed successfully</p>
            </div>
            
            <div class="content">
              <p>Hello ${data.studentName},</p>
              
              <p>Your lesson with tutor <strong>${data.tutorName}</strong> has been completed successfully.</p>
              
              <div class="lesson-details">
                <h3>Completed Lesson Details:</h3>
                <p><strong>Date:</strong> ${format(data.lessonDate, 'EEEE, MMMM dd, yyyy')}</p>
                <p><strong>Time:</strong> ${data.lessonTime}</p>
                <p><strong>Duration:</strong> ${data.duration} minutes</p>
                <p><strong>Level:</strong> ${data.level}</p>
                <p><strong>Topic:</strong> ${data.topic}</p>
              </div>
              
              <p>
                <a href="${data.dashboardUrl}" class="button">View Lesson Details</a>
              </p>
              
              <p>We hope you found this lesson helpful. Keep up the great work!</p>
              
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

  private generatePaymentApprovalHtml(data: PaymentApprovalData): string {
    const isApproved = data.decision === 'approved';
    const headerBg = isApproved ? '#d4edda' : '#f8d7da';
    const headerColor = isApproved ? '#155724' : '#721c24';
    const buttonBg = isApproved ? '#28a745' : '#dc3545';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Payment ${isApproved ? 'Approved' : 'Rejected'}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${headerBg}; padding: 20px; text-align: center; border-radius: 8px; color: ${headerColor}; }
            .content { padding: 20px 0; }
            .payment-details { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; background: ${buttonBg}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment ${isApproved ? 'Approved' : 'Rejected'}</h1>
              <p>Your earnings for the period ${data.periodStart} to ${data.periodEnd} have been ${data.decision}</p>
            </div>
            
            <div class="content">
              <p>Hello ${data.tutorName},</p>
              
              <p>Your earnings for the period <strong>${data.periodStart} to ${data.periodEnd}</strong> have been <strong>${data.decision}</strong> by our admin team.</p>
              
              <div class="payment-details">
                <h3>Payment Details:</h3>
                <p><strong>Period:</strong> ${data.periodStart} to ${data.periodEnd}</p>
                <p><strong>Total Hours:</strong> ${data.totalHours} hours</p>
                <p><strong>Total Amount:</strong> $${data.totalAmount.toFixed(2)}</p>
                <p><strong>Status:</strong> <span style="color: ${isApproved ? '#28a745' : '#dc3545'}; font-weight: bold;">${data.decision.toUpperCase()}</span></p>
              </div>
              
              ${isApproved ?
        '<p>Your payment will be processed according to our payment schedule. Thank you for your excellent work!</p>' :
        '<p>If you have any questions about this decision, please contact our admin team.</p>'
      }
              
              <p>
                <a href="${data.dashboardUrl}" class="button">View Earnings Details</a>
              </p>
              
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

  private generatePasswordResetHtml(data: PasswordResetData): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset Request</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #e3f2fd; padding: 20px; text-align: center; border-radius: 8px; }
            .content { padding: 20px 0; }
            .reset-link { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
              <p>You have requested to reset your password for your Ebbas Mattehjelp account.</p>
            </div>
            
            <div class="content">
              <p>Hello ${data.name},</p>
              
              <p>We have received a request to reset the password for your Ebbas Mattehjelp account. To proceed with the password reset, please click the link below:</p>
              
              <div class="reset-link">
                <p><strong>Reset Link:</strong> <a href="${data.resetLink}">${data.resetLink}</a></p>
              </div>
              
              <p>If you did not request this password reset, please ignore this email.</p>
              
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
}
