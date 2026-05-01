import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

import { AbcMetricEnum } from '@/reports/enums/abc-metric.enum';
import { AbcAnalysisType } from '@/reports/types/abc-analysis.type';

@ObjectType()
export class AbcAnalysisSummaryType {
  @Field(() => Float)
  totalValue: number;

  @Field(() => AbcMetricEnum)
  metric: AbcMetricEnum;

  @Field(() => Int)
  aCount: number;

  @Field(() => Int)
  bCount: number;

  @Field(() => Int)
  cCount: number;
}

@ObjectType()
export class AbcAnalysisResponse {
  @Field(() => [AbcAnalysisType])
  items: AbcAnalysisType[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => AbcAnalysisSummaryType)
  summary: AbcAnalysisSummaryType;
}
