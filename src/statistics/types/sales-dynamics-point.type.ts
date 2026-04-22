import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SalesDynamicsPoint {
  @Field(() => String, {
    description: 'Formatted date label (e.g. "2024-03-18", "2024-W11", "2024-03")',
  })
  date!: string;

  @Field(() => ID)
  productId!: string;

  @Field(() => Int, { description: 'Total units sold in this period' })
  value!: number;
}
