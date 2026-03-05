import { registerEnumType } from '@nestjs/graphql';

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
}

registerEnumType(ProductStatus, {
  name: 'ProductStatus',
});
