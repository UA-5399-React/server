import { Field, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

@InputType()
export class SendNewsletterInput {
  @Field()
  @IsString()
  subject: string;

  @Field()
  @IsString()
  text: string;
}
