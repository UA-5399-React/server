import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MailModule } from '@/mailer/mailer.module';

import {
  NewsletterSubscriber,
  NewsletterSubscriberSchema,
} from './entities/newsletter-subscriber.entity';
import { NewsletterController } from './newsletter.controller';
import { NewsletterResolver } from './newsletter.resolver';
import { NewsletterService } from './newsletter.service';
import { NewsletterAdminService } from './newsletter-admin.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NewsletterSubscriber.name, schema: NewsletterSubscriberSchema },
    ]),
    MailModule,
  ],
  controllers: [NewsletterController],
  providers: [NewsletterService, NewsletterResolver, NewsletterAdminService],
})
export class NewsletterModule {}
