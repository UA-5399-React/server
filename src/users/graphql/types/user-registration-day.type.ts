import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserRegistrationDayType {
  /** Calendar day of month (1–31). */
  @Field(() => Int)
  day!: number;

  /** ISO date `YYYY-MM-DD` (UTC calendar day of registration). */
  @Field(() => String)
  date!: string;

  @Field(() => Int)
  count!: number;
}
