import { registerEnumType } from '@nestjs/graphql';

export enum GroupByEnum {
  PRODUCT = 'PRODUCT',
  CATEGORY = 'CATEGORY',
  DAY = 'DAY',
}

registerEnumType(GroupByEnum, { name: 'GroupByEnum' });
