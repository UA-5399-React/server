import { Module } from '@nestjs/common';

import { MailController } from './mailer.controller';
import { MailService } from './mailer.service';

@Module({
  providers: [MailService],
  controllers: [MailController],
  exports: [MailService],
})
export class MailModule {}
