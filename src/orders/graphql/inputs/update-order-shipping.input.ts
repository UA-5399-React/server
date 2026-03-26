import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

import { ShippingCarrier } from '@/orders/enums';

@InputType()
export class OrderShippingAddressInput {
  @Field(() => ShippingCarrier, { nullable: true })
  @IsEnum(ShippingCarrier)
  @IsOptional()
  carrier?: ShippingCarrier;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  city?: string;

  @Field(() => Int, { nullable: true })
  @IsNumber()
  @IsOptional()
  branchNumber?: string;
}

@InputType()
export class UpdateOrderShippingAddressInput {
  @Field(() => String)
  @IsString()
  orderId!: string;

  @Field(() => OrderShippingAddressInput)
  @ValidateNested()
  @Type(() => OrderShippingAddressInput)
  shippingAddress!: OrderShippingAddressInput;
}
