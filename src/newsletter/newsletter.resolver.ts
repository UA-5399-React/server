import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { Roles } from '@/auth/decorators/Roles';
import { GqlAuthGuard } from '@/auth/guards/gql-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Role } from '@/users/enums/role.enum';

import { GetSubscribersInput } from './graphql/input/get-subscribers.input';
import { SendNewsletterInput } from './graphql/input/send-newsletter.input';
import { NewsletterStatsModel } from './graphql/models/newsletter-stats.model';
import { SendNewsletterResultModel } from './graphql/models/send-newsletter-result.model';
import { SubscriberModel } from './graphql/models/subscriber.model';
import { NewsletterAdminService } from './newsletter-admin.service';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class NewsletterResolver {
  constructor(private readonly newsletterAdminService: NewsletterAdminService) {}

  @Query(() => [SubscriberModel])
  async getSubscribers(
    @Args('input', { nullable: true }) input?: GetSubscribersInput,
  ): Promise<SubscriberModel[]> {
    return this.newsletterAdminService.getSubscribers(input);
  }

  @Query(() => NewsletterStatsModel)
  async getSubscriberStats(): Promise<NewsletterStatsModel> {
    return this.newsletterAdminService.getSubscriberStats();
  }

  @Mutation(() => SendNewsletterResultModel)
  async sendNewsletter(
    @Args('input') input: SendNewsletterInput,
  ): Promise<SendNewsletterResultModel> {
    return this.newsletterAdminService.sendNewsletter(input);
  }

  @Mutation(() => Boolean)
  async deleteSubscriber(@Args('email') email: string): Promise<boolean> {
    return this.newsletterAdminService.deleteSubscriber(email);
  }
}
