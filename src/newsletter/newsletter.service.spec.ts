import { ConflictException, InternalServerErrorException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';

import { MailService } from '@/mailer/mailer.service';

import { NewsletterSubscriber } from './entities/newsletter-subscriber.entity';
import { NewsletterService } from './newsletter.service';

const mockSubscriber = (overrides = {}) => ({
  _id: 'some-id',
  email: 'test@gmail.com',
  isActive: true,
  save: jest.fn(),
  ...overrides,
});

const mockSubscriberModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  deleteOne: jest.fn(),
};

const mockMailService = {
  sendNewsletterConfirmation: jest.fn(),
  sendUnsubscribeConfirmation: jest.fn(),
};

describe('NewsletterService', () => {
  let service: NewsletterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsletterService,
        { provide: getModelToken(NewsletterSubscriber.name), useValue: mockSubscriberModel },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<NewsletterService>(NewsletterService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('subscribe', () => {
    it('should create a new subscriber and send confirmation email', async () => {
      const subscriber = mockSubscriber();
      mockSubscriberModel.findOne.mockResolvedValue(null);
      mockSubscriberModel.create.mockResolvedValue(subscriber);
      mockMailService.sendNewsletterConfirmation.mockResolvedValue(undefined);

      const result = await service.subscribe({ email: 'test@gmail.com' });

      expect(mockSubscriberModel.create).toHaveBeenCalledWith({ email: 'test@gmail.com' });
      expect(mockMailService.sendNewsletterConfirmation).toHaveBeenCalledWith('test@gmail.com');
      expect(result).toEqual({ message: 'Successfully subscribed' });
    });

    it('should throw ConflictException if subscriber is already active', async () => {
      mockSubscriberModel.findOne.mockResolvedValue(mockSubscriber({ isActive: true }));

      await expect(service.subscribe({ email: 'test@gmail.com' })).rejects.toThrow(
        ConflictException,
      );

      expect(mockSubscriberModel.create).not.toHaveBeenCalled();
    });

    it('should reactivate subscriber if previously unsubscribed', async () => {
      const subscriber = mockSubscriber({ isActive: false });
      mockSubscriberModel.findOne.mockResolvedValue(subscriber);
      mockMailService.sendNewsletterConfirmation.mockResolvedValue(undefined);

      const result = await service.subscribe({ email: 'test@gmail.com' });

      expect(subscriber.isActive).toBe(true);
      expect(subscriber.save).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Successfully re-subscribed' });
    });

    it('should rollback created record if confirmation email fails', async () => {
      const subscriber = mockSubscriber();
      mockSubscriberModel.findOne.mockResolvedValue(null);
      mockSubscriberModel.create.mockResolvedValue(subscriber);
      mockMailService.sendNewsletterConfirmation.mockRejectedValue(new Error('SMTP error'));

      await expect(service.subscribe({ email: 'test@gmail.com' })).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(mockSubscriberModel.deleteOne).toHaveBeenCalledWith({ _id: subscriber._id });
    });

    it('should rollback isActive to false if confirmation email fails on reactivation', async () => {
      const subscriber = mockSubscriber({ isActive: false });
      mockSubscriberModel.findOne.mockResolvedValue(subscriber);
      mockMailService.sendNewsletterConfirmation.mockRejectedValue(new Error('SMTP error'));

      await expect(service.subscribe({ email: 'test@gmail.com' })).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(subscriber.isActive).toBe(false);
      expect(subscriber.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('unsubscribe', () => {
    it('should deactivate subscriber and send unsubscribe confirmation', async () => {
      const subscriber = mockSubscriber({ isActive: true });
      mockSubscriberModel.findOne.mockResolvedValue(subscriber);
      mockMailService.sendUnsubscribeConfirmation.mockResolvedValue(undefined);

      const result = await service.unsubscribe('test@gmail.com');

      expect(subscriber.isActive).toBe(false);
      expect(subscriber.save).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Successfully unsubscribed' });
    });

    it('should return "Email not found" if subscriber does not exist', async () => {
      mockSubscriberModel.findOne.mockResolvedValue(null);

      const result = await service.unsubscribe('notexist@gmail.com');

      expect(result).toEqual({ message: 'Email not found' });
      expect(mockMailService.sendUnsubscribeConfirmation).not.toHaveBeenCalled();
    });

    it('should rollback isActive to true if unsubscribe confirmation email fails', async () => {
      const subscriber = mockSubscriber({ isActive: true });
      mockSubscriberModel.findOne.mockResolvedValue(subscriber);
      mockMailService.sendUnsubscribeConfirmation.mockRejectedValue(new Error('SMTP error'));

      await expect(service.unsubscribe('test@gmail.com')).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(subscriber.isActive).toBe(true);
      expect(subscriber.save).toHaveBeenCalledTimes(2);
    });
  });
});
