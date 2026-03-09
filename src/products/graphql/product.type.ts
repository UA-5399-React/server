import { Field, Float, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

import { ProductStatus } from '@/products/enums/product-status.enum';

@ObjectType({ description: 'product' })
export class ProductType {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  productCode: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field(() => [String])
  categories: string[];

  @Field(() => Float)
  price: number;

  @Field(() => ProductStatus)
  status: ProductStatus;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}
