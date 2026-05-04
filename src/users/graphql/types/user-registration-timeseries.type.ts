import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserRegistrationMonthType {
  @Field(() => String)
  month!: string;

  @Field(() => Int)
  count!: number;
}

@ObjectType()
export class UserRegistrationTimeseriesType {
  @Field(() => [UserRegistrationMonthType])
  data!: UserRegistrationMonthType[];
}
