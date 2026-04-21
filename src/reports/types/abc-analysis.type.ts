import { Field, Float, ObjectType } from '@nestjs/graphql';

type AbcCategory = 'A' | 'B' | 'C';

@ObjectType()
export class AbcAnalysisType {
  // @Field(() => String)
  // productCode: string;

  @Field(() => String)
  productName: string;

  @Field(() => Float)
  value: number;

  @Field(() => Float)
  cumulativeValue: number;

  @Field(() => Float)
  totalValue: number;

  @Field(() => Float)
  cumulativePercentage: number;

  @Field(() => Float)
  percentageByTotal: number;

  @Field(() => String)
  bucket: AbcCategory;
}
