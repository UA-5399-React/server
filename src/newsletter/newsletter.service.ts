import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { MailService } from '@/mailer/mailer.service';

import { SubscribeDto } from './dto/subscribe.dto';
import {
  NewsletterSubscriber,
  NewsletterSubscriberDocument,
} from './entities/newsletter-subscriber.entity';

@Injectable()
export class NewsletterService {
  constructor(
    @InjectModel(NewsletterSubscriber.name)
    private readonly subscriberModel: Model<NewsletterSubscriberDocument>,
    private readonly mailService: MailService,
  ) {}

  async subscribe(dto: SubscribeDto) {
    const existing = await this.subscriberModel.findOne({ email: dto.email });

    if (existing) {
      if (existing.isActive) {
        return { message: 'This email is already subscribed' };
      }

      existing.isActive = true;
      await existing.save();

      try {
        await this.mailService.sendNewsletterConfirmation(dto.email);
      } catch {
        existing.isActive = false;
        await existing.save();
        return { message: 'Failed to send confirmation email' };
      }

      return { message: 'Successfully re-subscribed' };
    }

    const subscriber = await this.subscriberModel.create({ email: dto.email });

    try {
      await this.mailService.sendNewsletterConfirmation(dto.email);
    } catch {
      await this.subscriberModel.deleteOne({ _id: subscriber._id });
      return { message: 'Failed to send confirmation email' };
    }

    return { message: 'Successfully subscribed' };
  }

  async unsubscribe(email: string) {
    const subscriber = await this.subscriberModel.findOne({ email });

    if (!subscriber) return { message: 'Email not found' };

    subscriber.isActive = false;
    await subscriber.save();

    try {
      await this.mailService.sendUnsubscribeConfirmation(email);
    } catch {
      subscriber.isActive = true;
      await subscriber.save();
      return { message: 'Failed to send confirmation email' };
    }

    return { message: 'Successfully unsubscribed' };
  }
}
