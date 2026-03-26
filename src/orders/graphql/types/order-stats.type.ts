import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class OrderStatsType {
  @Field(() => Int)
  totalOrders!: number;

  @Field(() => Int)
  completedOrders!: number;

  @Field(() => Int)
  newOrders!: number;

  @Field(() => Int)
  processingOrders!: number;

  @Field(() => Int)
  shippingOrders!: number;

  @Field(() => Int)
  cancelledOrders!: number;
}
