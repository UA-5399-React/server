import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class OrderProductStatsType {
  @Field(() => String)
  productId!: string;

  @Field(() => Int)
  totalOrders!: number;

  @Field(() => Int)
  totalAmount!: number;

  @Field(() => Int)
  activeOrders!: number;

  @Field(() => Int)
  activeAmount!: number;
}
