import { Field, Int, ObjectType } from '@nestjs/graphql';

import { ProductType } from '@/products/graphql/product.type';

@ObjectType()
export class ProductsPageType {
  @Field(() => [ProductType])
  items: ProductType[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;
}
