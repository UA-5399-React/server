import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

import { createTransporter } from './nodemailer-config';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = createTransporter();
  }
  async sendEmail(to: string, subject: string, html: string) {
    return this.transporter.sendMail({
      from: `"Techno World" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  }

  async sendTestEmail(to: string) {
    const info = await this.transporter.sendMail({
      from: `"Test App" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Test Email',
      text: 'Nodemailer is working',
    });

    return info;
  }

  async sendOrderStatusEmail(to: string, orderId: string, status: string) {
    const subject = `Your order ${orderId} is now ${status}`;
    const text = `Hello,

      Your order with ID ${orderId} has changed its status to: ${status}.

      Thank you for shopping with us!

      Best regards,
      Techno World Team`;

    return this.sendEmail(to, subject, text);
  }

  async sendEmailVerification(to: string, link: string) {
    const subject = 'Email verification';
    const text = `Hello,

      Please verify your email by clicking the link below:

      ${link}

      This link will expire soon.

      If you did not request this, please ignore this email.

      Best regards,  
      Techno World Team`;

    return this.sendEmail(to, subject, text);
  }

  async sendNewsletterConfirmation(to: string) {
    const subject = 'You are subscribed to Techno World newsletter!';
    const text = `Hello,

    Thank you for subscribing to our newsletter!
    You will now receive the latest news and updates from Techno World.

    If you wish to unsubscribe, visit:
    ${process.env.CLIENT_URL}/newsletter/unsubscribe?email=${encodeURIComponent(to)}

    Best regards,
    Techno World Team`;

    return this.sendEmail(to, subject, text);
  }

  async sendUnsubscribeConfirmation(to: string) {
    const subject = 'You have unsubscribed from Techno World newsletter';
    const text = `Hello,

      You have successfully unsubscribed from the Techno World newsletter.
      You will no longer receive emails from us.

      If this was a mistake, you can re-subscribe at:
      ${process.env.CLIENT_URL}/newsletter/subscribe

      Best regards,
      Techno World Team`;

    return this.sendEmail(to, subject, text);
  }

  async sendResetPasswordToken(to: string, link: string) {
    const subject = 'Reset Password Request';
    const text = `Hello,

      We received a request to reset your password. To proceed, please click the link below:

      ${link}

      If you did not request a password reset, please ignore this email. Your account will remain secure.

      Best regards,  
      Techno World Team`;

    return this.sendEmail(to, subject, text);
  }

  async sendTempPassword(to: string, tempPassword: string) {
    const subject = 'Your account created';
    const text = `Hello,

      Your account has been successfully created. To access it, please use the following temporary password:.
      Password: ${tempPassword}
      
      For your security we strongly recommend that you log in and change it to a new permanent password as soon as possible.

      If you did not request this account, please contact our support team immediately.

      Best regards,
      Techno World Team`;
    return this.sendEmail(to, subject, text);
  }
}
