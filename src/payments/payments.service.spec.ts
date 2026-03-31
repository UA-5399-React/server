import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { OrdersService } from '@/orders/orders.service';

import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let configValues: Record<string, string>;

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => configValues[key]),
  };

  const mockOrdersService = {
    updatePaymentStatus: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    configValues = {
      STRIPE_SECRET_KEY: 'sk_test_fake_key_for_testing',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_fake_secret',
      CLIENT_URL: 'https://client-one-indol-61.vercel.app',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
    mockConfigService.getOrThrow.mockClear();
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

      const result = await service.createCheckoutSession([
        {
          productId: '665f1b2c3e4a5b6c7d8e9f00',
          title: 'Test Product',
          price: 29.99,
          quantity: 2,
        },
      ]);

      expect(result).toEqual({
        sessionId: 'cs_test_123',
        sessionUrl: 'https://checkout.stripe.com/pay/cs_test_123',
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service['stripe'].checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          payment_method_types: ['card'],
          success_url:
            'https://client-one-indol-61.vercel.app/order-confirmation?session_id={CHECKOUT_SESSION_ID}',
          cancel_url: 'https://client-one-indol-61.vercel.app/cart',
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                currency: 'usd',
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

    it('should include orderId in session metadata when provided', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };

      const createSpy = jest
        .spyOn(service['stripe'].checkout.sessions, 'create')
        .mockResolvedValue(mockSession as any);

      await service.createCheckoutSession(
        [{ productId: 'p1', title: 'Item', price: 10, quantity: 1 }],
        'ORD-20240318-AB12C',
      );

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ orderId: 'ORD-20240318-AB12C' }),
        }),
      );
    });

    it('derives checkout redirect urls from CLIENT_URL without localhost fallbacks', async () => {
      const createSpy = jest
        .spyOn(service['stripe'].checkout.sessions, 'create')
        .mockResolvedValue({
          id: 'cs_test_123',
          url: 'https://checkout.stripe.com/pay/cs_test_123',
        } as any);

      await service.createCheckoutSession([
        { productId: 'p1', title: 'Item', price: 10, quantity: 1 },
      ]);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url:
            'https://client-one-indol-61.vercel.app/order-confirmation?session_id={CHECKOUT_SESSION_ID}',
          cancel_url: 'https://client-one-indol-61.vercel.app/cart',
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
    it('should update order to PAID on checkout.session.completed with orderId', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            payment_intent: 'pi_test_456',
            metadata: { orderId: 'ORD-20240318-AB12C', productIds: 'p1' },
          },
        },
      };

      await service.handleWebhookEvent(event as any);

      expect(mockOrdersService.updatePaymentStatus).toHaveBeenCalledWith(
        'ORD-20240318-AB12C',
        'paid',
        'pi_test_456',
      );
    });

    it('should warn but not throw when orderId is absent in checkout.session.completed', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            payment_intent: 'pi_test_456',
            metadata: { productIds: 'p1' },
          },
        },
      };

      await expect(service.handleWebhookEvent(event as any)).resolves.not.toThrow();
      expect(mockOrdersService.updatePaymentStatus).not.toHaveBeenCalled();
    });

    it('should update order to FAILED on checkout.session.expired with orderId', async () => {
      const event = {
        type: 'checkout.session.expired',
        data: {
          object: {
            id: 'cs_test_expired',
            metadata: { orderId: 'ORD-20240318-AB12C' },
          },
        },
      };

      await service.handleWebhookEvent(event as any);

      expect(mockOrdersService.updatePaymentStatus).toHaveBeenCalledWith(
        'ORD-20240318-AB12C',
        'failed',
      );
    });

    it('should handle payment_intent.payment_failed event', async () => {
      const event = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_456',
            last_payment_error: { message: 'Card declined' },
          },
        },
      };

      await expect(service.handleWebhookEvent(event as any)).resolves.not.toThrow();
    });

    it('should handle unknown event types gracefully', async () => {
      const event = {
        type: 'some.unknown.event',
        data: { object: {} },
      };

      await expect(service.handleWebhookEvent(event as any)).resolves.not.toThrow();
    });
  });
});
