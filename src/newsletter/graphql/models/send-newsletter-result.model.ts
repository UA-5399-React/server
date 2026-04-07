import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SendNewsletterResultModel {
  @Field(() => Int)
  sent: number;

  @Field(() => Int)
  failed: number;
}
