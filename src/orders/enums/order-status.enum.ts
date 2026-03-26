import { registerEnumType } from '@nestjs/graphql';

export enum OrderStatus {
  NEW = 'new',
  PROCESSING = 'processing',
  SHIPPING = 'shipping',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

registerEnumType(OrderStatus, { name: 'OrderStatus' });
