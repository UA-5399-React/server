import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';

@InputType()
export class OrderUserInput {
  @Field(() => String)
  @IsString()
  firstName!: string;

  @Field(() => String)
  @IsString()
  lastName!: string;

  @Field(() => String)
  @IsString()
  email!: string;

  @Field(() => String)
  @IsString()
  phone!: string;
}

@InputType()
export class UpdateOrderUserInput {
  @Field(() => String)
  @IsString()
  orderId!: string;

  @Field(() => OrderUserInput)
  @ValidateNested()
  @Type(() => OrderUserInput)
  user!: OrderUserInput;
}
