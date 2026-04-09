import { registerEnumType } from '@nestjs/graphql';

export enum ProductSortField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  price = 'price',
  title = 'title',
  purchaseCount = 'purchaseCount',
}

registerEnumType(ProductSortField, { name: 'ProductSortField' });
