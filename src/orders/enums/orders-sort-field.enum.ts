import { registerEnumType } from '@nestjs/graphql';

export enum OrdersSortField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  totalPrice = 'totalPrice',
  orderId = 'orderId',
  customerName = 'customerName',
  status = 'status',
}

registerEnumType(OrdersSortField, { name: 'OrdersSortField' });
