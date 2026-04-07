import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class GetSubscribersInput {
  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;
}
