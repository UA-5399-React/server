import { registerEnumType } from '@nestjs/graphql';

export enum PaymentMethod {
  CASH_ON_DELIVERY = 'cash_on_delivery',
  STRIPE = 'stripe',
}

registerEnumType(PaymentMethod, { name: 'PaymentMethod' });
