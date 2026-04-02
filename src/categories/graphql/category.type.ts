import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

import { ProductType } from '@/products/graphql/product.type';

@ObjectType()
export class CategoryType {
  @Field(() => ID)
  _id!: string;

  @Field()
  title!: string;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  parent?: string;

  @Field(() => Int)
  depth!: number;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  @Field(() => [ProductType], { nullable: true })
  products?: ProductType[];
}
