import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class OrderStatusSegmentType {
  @Field()
  status!: string;

  @Field(() => Int)
  count!: number;
}

@ObjectType()
export class OrdersStatusStatsType {
  @Field(() => Int)
  total!: number;

  @Field(() => [OrderStatusSegmentType])
  statuses!: OrderStatusSegmentType[];
}
