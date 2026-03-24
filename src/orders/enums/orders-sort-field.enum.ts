import { registerEnumType } from '@nestjs/graphql';

export enum OrdersSortField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  totalPrice = 'totalPrice',
}

registerEnumType(OrdersSortField, { name: 'OrdersSortField' });
