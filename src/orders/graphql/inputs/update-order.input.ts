import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';

import { OrderStatus } from '@/orders/enums';

import { UpdateOrderItemInput } from './update-order-items.input';
import { OrderShippingAddressInput } from './update-order-shipping.input';
import { OrderUserInput } from './update-order-user.input';

@InputType()
export class UpdateOrderInput {
  @Field(() => String)
  @IsString()
  orderId!: string;

  @Field(() => OrderStatus, { nullable: true })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @Field(() => [UpdateOrderItemInput], { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderItemInput)
  items?: UpdateOrderItemInput[];

  @Field(() => OrderUserInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderUserInput)
  user?: OrderUserInput;

  @Field(() => OrderShippingAddressInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderShippingAddressInput)
  shippingAddress?: OrderShippingAddressInput;
}
