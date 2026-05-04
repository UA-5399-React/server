import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ProductImageType {
  @Field()
  imageUrl!: string;

  @Field()
  imagePublicId!: string;
}
