import { Injectable } from '@nestjs/common';

import { transporter } from './nodemailer-config';

@Injectable()
export class MailService {
  async sendEmail(to: string, subject: string, text: string) {
    return transporter.sendMail({
      from: 'Techno World',
      to,
      subject,
      text,
    });
  }

  async sendTestEmail(to: string) {
    const info = await transporter.sendMail({
      from: `"Test App" <${process.env.MAIL_USER}>`,
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
}
