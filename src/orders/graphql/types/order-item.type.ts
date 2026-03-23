import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class OrderItemType {
  @Field(() => ID)
  product!: string;

  @Field()
  title!: string;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field()
  unitPrice!: number;

  @Field(() => Int)
  amount!: number;
}
