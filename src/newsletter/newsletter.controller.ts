import { Body, Controller, Patch, Post, Query } from '@nestjs/common';

import { SubscribeDto } from './dto/subscribe.dto';
import { NewsletterService } from './newsletter.service';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  subscribe(@Body() dto: SubscribeDto) {
    return this.newsletterService.subscribe(dto);
  }

  @Patch('unsubscribe')
  unsubscribe(@Query('email') email: string) {
    return this.newsletterService.unsubscribe(email);
  }
}
