import { Field, Float, Int, InterfaceType } from '@nestjs/graphql';

@InterfaceType()
export class SalesReportItemType {
  @Field(() => Int)
  unitsSold: number;

  @Field(() => Float)
  revenue: number;
}
