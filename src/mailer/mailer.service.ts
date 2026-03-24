import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

import { createTransporter } from './nodemailer-config';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = createTransporter();
  }
  async sendEmail(to: string, subject: string, text: string) {
    return this.transporter.sendMail({
      from: 'Techno World',
      to,
      subject,
      text,
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
}
