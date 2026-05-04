import { Field, Float, GraphQLISODateTime, ID, Int, ObjectType } from '@nestjs/graphql';

import { ProductStatus } from '@/products/enums/product-status.enum';
import { ProductImageType } from '@/products/graphql/product-image.type';

@ObjectType({ description: 'product' })
export class ProductType {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  productCode!: string;

  @Field()
  title!: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field({ nullable: true })
  imagePublicId?: string;

  @Field(() => [ProductImageType], { nullable: true })
  additionalImages?: ProductImageType[];

  @Field(() => [String])
  categories!: string[];

  @Field(() => Float)
  price!: number;

  @Field(() => ProductStatus)
  status!: ProductStatus;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;

  @Field(() => Int, { nullable: true })
  purchaseCount?: number;
}
