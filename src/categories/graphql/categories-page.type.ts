import { Field, Int, ObjectType } from '@nestjs/graphql';

import { CategoryType } from '@/categories/graphql/category.type';

@ObjectType()
export class CategoriesPageType {
  @Field(() => [CategoryType])
  items: CategoryType[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;
}
