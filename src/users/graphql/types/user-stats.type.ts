import { Field, Int, ObjectType } from '@nestjs/graphql';

import { UserRegistrationDayType } from '@/users/graphql/types/user-registration-day.type';

@ObjectType()
export class UserStatsType {
  @Field(() => Int)
  totalUsers!: number;

  @Field(() => Int)
  activeUsers!: number;

  @Field(() => Int)
  blockedUsers!: number;

  @Field(() => Int)
  registrationsYear!: number;

  @Field(() => Int)
  registrationsMonth!: number;

  @Field(() => [UserRegistrationDayType])
  registrationsByDay!: UserRegistrationDayType[];
}
