import { registerEnumType } from '@nestjs/graphql';

export enum OrderDateFilterField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

registerEnumType(OrderDateFilterField, {
  name: 'OrderDateFilterField',
});
