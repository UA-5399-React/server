import { registerEnumType } from '@nestjs/graphql';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

registerEnumType(PaymentStatus, { name: 'PaymentStatus' });
