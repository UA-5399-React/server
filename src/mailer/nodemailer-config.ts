import * as nodemailer from 'nodemailer';

export function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.GOOGLE_APP_PASSWORD,
    },
  });
}
