import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsString } from 'class-validator';

import { OrderStatus } from '@/orders/enums';

@InputType()
export class UpdateOrderStatusInput {
  @Field(() => String)
  @IsString()
  orderId!: string;

  @Field(() => OrderStatus)
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
