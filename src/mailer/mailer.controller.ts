import { Controller, Get, Query } from '@nestjs/common';

import { MailService } from './mailer.service';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('test')
  async sendTest(@Query('to') to: string) {
    return this.mailService.sendTestEmail(to);
  }
}
