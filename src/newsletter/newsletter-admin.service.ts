import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { MailService } from '@/mailer/mailer.service';

import {
  NewsletterSubscriber,
  NewsletterSubscriberDocument,
} from './entities/newsletter-subscriber.entity';
import { GetSubscribersInput } from './graphql/input/get-subscribers.input';
import { SendNewsletterInput } from './graphql/input/send-newsletter.input';

@Injectable()
export class NewsletterAdminService {
  constructor(
    @InjectModel(NewsletterSubscriber.name)
    private readonly subscriberModel: Model<NewsletterSubscriberDocument>,
    private readonly mailService: MailService,
  ) {}

  async getSubscribers(input?: GetSubscribersInput) {
    const filter = input?.isActive !== undefined ? { isActive: input.isActive } : {};
    const subscribers = await this.subscriberModel.find(filter).lean();

    return subscribers.map((s) => ({
      id: s._id.toString(),
      email: s.email,
      isActive: s.isActive,
    }));
  }

  async getSubscriberStats() {
    const [total, active] = await Promise.all([
      this.subscriberModel.countDocuments(),
      this.subscriberModel.countDocuments({ isActive: true }),
    ]);

    return { total, active, inactive: total - active };
  }

  async sendNewsletter(input: SendNewsletterInput) {
    const subscribers = await this.subscriberModel.find({ isActive: true });

    if (!subscribers.length) return { sent: 0, failed: 0 };

    const results = await Promise.allSettled(
      subscribers.map((s) => this.mailService.sendEmail(s.email, input.subject, input.text)),
    );

    return {
      sent: results.filter((r) => r.status === 'fulfilled').length,
      failed: results.filter((r) => r.status === 'rejected').length,
    };
  }

  async deleteSubscriber(email: string) {
    const result = await this.subscriberModel.deleteOne({ email });

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Subscriber with email ${email} not found`);
    }

    return true;
  }
}
