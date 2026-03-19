import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      const config: Record<string, string> = {
        STRIPE_SECRET_KEY: 'sk_test_fake_key_for_testing',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_fake_secret',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentsService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCheckoutSession', () => {
    it('should call Stripe API and return session data', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };

      jest
        .spyOn(service['stripe'].checkout.sessions, 'create')
        .mockResolvedValue(mockSession as any);

      const result = await service.createCheckoutSession(
        [
          {
            productId: '665f1b2c3e4a5b6c7d8e9f00',
            title: 'Test Product',
            price: 29.99,
            quantity: 2,
          },
        ],
        'http://localhost:5173/order-confirmation',
        'http://localhost:5173/cart',
      );

      expect(result).toEqual({
        sessionId: 'cs_test_123',
        sessionUrl: 'https://checkout.stripe.com/pay/cs_test_123',
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service['stripe'].checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          payment_method_types: ['card'],
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                currency: 'uah',
                unit_amount: 2999,
                product_data: expect.objectContaining({
                  name: 'Test Product',
                }),
              }),
              quantity: 2,
            }),
          ],
        }),
      );
    });
  });

  describe('getSessionStatus', () => {
    it('should retrieve session status from Stripe', async () => {
      const mockSession = {
        status: 'complete',
        payment_status: 'paid',
      };

      jest
        .spyOn(service['stripe'].checkout.sessions, 'retrieve')
        .mockResolvedValue(mockSession as any);

      const result = await service.getSessionStatus('cs_test_123');

      expect(result).toEqual({
        status: 'complete',
        paymentStatus: 'paid',
      });
    });
  });

  describe('constructWebhookEvent', () => {
    it('should throw on invalid signature', () => {
      const rawBody = Buffer.from('{}');
      const invalidSignature = 'invalid_sig';

      expect(() => service.constructWebhookEvent(rawBody, invalidSignature)).toThrow();
    });
  });

  describe('handleWebhookEvent', () => {
    it('should handle checkout.session.completed event', () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            payment_intent: 'pi_test_456',
          },
        },
      };

      expect(() => service.handleWebhookEvent(event as any)).not.toThrow();
    });

    it('should handle payment_intent.payment_failed event', () => {
      const event = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_456',
            last_payment_error: { message: 'Card declined' },
          },
        },
      };

      expect(() => service.handleWebhookEvent(event as any)).not.toThrow();
    });

    it('should handle unknown event types gracefully', () => {
      const event = {
        type: 'some.unknown.event',
        data: { object: {} },
      };

      expect(() => service.handleWebhookEvent(event as any)).not.toThrow();
    });
  });
});
