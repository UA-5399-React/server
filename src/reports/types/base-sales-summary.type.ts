import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class BaseSalesSummaryType {
  @Field(() => Float)
  totalRevenue: number;

  @Field(() => Int)
  totalUnitsSold: number;
}
