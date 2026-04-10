import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { SubscribeDto } from './dto/subscribe.dto';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';

const mockNewsletterService = {
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
};

describe('NewsletterController', () => {
  let controller: NewsletterController;
  let service: NewsletterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NewsletterController],
      providers: [{ provide: NewsletterService, useValue: mockNewsletterService }],
    }).compile();

    controller = module.get<NewsletterController>(NewsletterController);
    service = module.get<NewsletterService>(NewsletterService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('subscribe', () => {
    it('should return success message when subscribing with a new email', async () => {
      const dto: SubscribeDto = { email: 'test@gmail.com' };
      mockNewsletterService.subscribe.mockResolvedValue({ message: 'Successfully subscribed' });

      const result = await controller.subscribe(dto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.subscribe).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ message: 'Successfully subscribed' });
    });

    it('should throw ConflictException if email is already subscribed', async () => {
      const dto: SubscribeDto = { email: 'test@gmail.com' };
      mockNewsletterService.subscribe.mockRejectedValue(new ConflictException());

      await expect(controller.subscribe(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('unsubscribe', () => {
    it('should return success message when unsubscribing', async () => {
      mockNewsletterService.unsubscribe.mockResolvedValue({ message: 'Successfully unsubscribed' });

      const result = await controller.unsubscribe('test@gmail.com');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.unsubscribe).toHaveBeenCalledWith('test@gmail.com');
      expect(result).toEqual({ message: 'Successfully unsubscribed' });
    });

    it('should return "Email not found" if email does not exist', async () => {
      mockNewsletterService.unsubscribe.mockResolvedValue({ message: 'Email not found' });

      const result = await controller.unsubscribe('notexist@gmail.com');

      expect(result).toEqual({ message: 'Email not found' });
    });
  });
});
