import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';

@InputType()
export class OrderUserInput {
  @Field(() => String)
  @IsString()
  @IsOptional()
  firstName?: string;

  @Field(() => String)
  @IsString()
  @IsOptional()
  lastName?: string;

  @Field(() => String)
  @IsString()
  @IsOptional()
  email?: string;

  @Field(() => String)
  @IsString()
  @IsOptional()
  phone?: string;
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
