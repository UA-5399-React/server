import { Test, TestingModule } from '@nestjs/testing';

import { GqlAuthGuard } from '@/auth/guards/gql-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';

import { NewsletterResolver } from './newsletter.resolver';
import { NewsletterAdminService } from './newsletter-admin.service';

const mockNewsletterAdminService = {
  getSubscribers: jest.fn(),
  getSubscriberStats: jest.fn(),
  sendNewsletter: jest.fn(),
  deleteSubscriber: jest.fn(),
};

describe('NewsletterResolver', () => {
  let resolver: NewsletterResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsletterResolver,
        { provide: NewsletterAdminService, useValue: mockNewsletterAdminService },
      ],
    })
      .overrideGuard(GqlAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = module.get<NewsletterResolver>(NewsletterResolver);
  });

  afterEach(() => jest.clearAllMocks());

  it('should call getSubscribers with input', async () => {
    mockNewsletterAdminService.getSubscribers.mockResolvedValue([]);
    await resolver.getSubscribers({ isActive: true });
    expect(mockNewsletterAdminService.getSubscribers).toHaveBeenCalledWith({ isActive: true });
  });

  it('should call getSubscriberStats', async () => {
    mockNewsletterAdminService.getSubscriberStats.mockResolvedValue({
      total: 5,
      active: 3,
      inactive: 2,
    });
    const result = await resolver.getSubscriberStats();
    expect(result).toEqual({ total: 5, active: 3, inactive: 2 });
  });

  it('should call sendNewsletter with input', async () => {
    mockNewsletterAdminService.sendNewsletter.mockResolvedValue({ sent: 3, failed: 0 });
    const result = await resolver.sendNewsletter({ subject: 'News', text: 'Hello' });
    expect(result).toEqual({ sent: 3, failed: 0 });
  });

  it('should call deleteSubscriber with email', async () => {
    mockNewsletterAdminService.deleteSubscriber.mockResolvedValue(true);
    const result = await resolver.deleteSubscriber('test@gmail.com');
    expect(result).toBe(true);
  });
});
