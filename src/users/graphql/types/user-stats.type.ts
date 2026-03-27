import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserStatsType {
  @Field(() => Int)
  totalUsers!: number;

  @Field(() => Int)
  activeUsers!: number;

  @Field(() => Int)
  blockedUsers!: number;
}
