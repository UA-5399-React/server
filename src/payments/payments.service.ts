import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

import { PaymentStatus } from '@/orders/enums/payment-status.enum';
import { OrdersService } from '@/orders/orders.service';

import { CheckoutItemDto } from './dto/create-checkout-session.dto';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly ordersService: OrdersService,
  ) {
    const secretKey = this.configService.getOrThrow<string>('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(secretKey);
  }

  async createCheckoutSession(
    items: CheckoutItemDto[],
    successUrl: string,
    cancelUrl: string,
    orderId?: string,
  ): Promise<{ sessionId: string; sessionUrl: string }> {
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.title,
          ...(item.imageUrl && { images: [item.imageUrl] }),
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        productIds: items.map((i) => i.productId).join(','),
        ...(orderId && { orderId }),
      },
    });

    this.logger.log(
      `Checkout session created: ${session.id}${orderId ? ` for order ${orderId}` : ''}`,
    );

    return {
      sessionId: session.id,
      sessionUrl: session.url!,
    };
  }

  async getSessionStatus(sessionId: string): Promise<{ status: string; paymentStatus: string }> {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);

    return {
      status: session.status ?? 'unknown',
      paymentStatus: session.payment_status,
    };
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');

    return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const intentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : (session.payment_intent?.id ?? undefined);

        const orderId = session.metadata?.orderId;

        if (orderId) {
          await this.ordersService.updatePaymentStatus(orderId, PaymentStatus.PAID, intentId);
          this.logger.log(
            `Payment completed — order ${orderId} marked as PAID (intent: ${intentId ?? 'n/a'})`,
          );
        } else {
          this.logger.warn(
            `checkout.session.completed: no orderId in metadata for session ${session.id}`,
          );
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        const orderId = session.metadata?.orderId;

        if (orderId) {
          await this.ordersService.updatePaymentStatus(orderId, PaymentStatus.FAILED);
          this.logger.warn(`Checkout session expired — order ${orderId} marked as FAILED`);
        } else {
          this.logger.warn(`Checkout session expired: ${session.id}`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        this.logger.warn(
          `Payment failed for intent: ${paymentIntent.id}, error: ${paymentIntent.last_payment_error?.message}`,
        );
        break;
      }

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }
}
