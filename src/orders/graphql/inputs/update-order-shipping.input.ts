import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsString, ValidateNested } from 'class-validator';

import { ShippingCarrier } from '@/orders/enums';

@InputType()
export class OrderShippingAddressInput {
  @Field(() => ShippingCarrier)
  @IsEnum(ShippingCarrier)
  carrier!: ShippingCarrier;

  @Field(() => String)
  @IsString()
  city!: string;

  @Field(() => Int)
  @IsNumber()
  branchNumber!: string;
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
