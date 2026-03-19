import { Injectable } from '@nestjs/common';

import { transporter } from './nodemailer-config';

@Injectable()
export class MailService {
  async sendEmail(to: string, subject: string) {
    return transporter.sendMail({
      from: 'Techno World',
      to,
      subject,
    });
  }

  async sendTestEmail(to: string) {
    const info = await transporter.sendMail({
      from: `"Test App" <${process.env.MAIL_USER}>`,
      to,
      subject: 'Test Email',
      text: 'Nodemailer is working 🚀',
    });

    return info;
  }
}
