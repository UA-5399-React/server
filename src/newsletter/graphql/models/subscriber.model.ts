import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SubscriberModel {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  isActive: boolean;
}
