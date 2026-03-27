import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

import { PaymentMethod, ShippingCarrier } from '@/orders/enums';

@InputType()
export class CreateOrderItemInput {
  @Field(() => ID)
  @IsString()
  product!: string;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  amount!: number;
}

@InputType()
export class CreateOrderShippingAddressInput {
  @Field(() => ShippingCarrier)
  @IsEnum(ShippingCarrier)
  carrier!: ShippingCarrier;

  @Field(() => String)
  @IsString()
  city!: string;

  @Field(() => String)
  @IsString()
  branchNumber!: string;
}

@InputType()
export class CreateOrderUserInput {
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
export class CreateOrderInput {
  @Field(() => [CreateOrderItemInput])
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemInput)
  items!: CreateOrderItemInput[];

  @Field(() => CreateOrderShippingAddressInput)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderShippingAddressInput)
  shippingAddress!: CreateOrderShippingAddressInput;

  @Field(() => CreateOrderUserInput)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderUserInput)
  user!: CreateOrderUserInput;

  @Field(() => PaymentMethod)
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  message?: string;
}
