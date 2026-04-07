import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class NewsletterStatsModel {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  active: number;

  @Field(() => Int)
  inactive: number;
}
