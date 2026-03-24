import { Field, GraphQLISODateTime, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional } from 'class-validator';

import { OrderStatus, PaymentMethod, PaymentStatus, ShippingCarrier } from '@/orders/enums';
import { OrderDateFilterField } from '@/orders/enums/date-filter-field.enum';

@InputType()
export class OrdersFilterInput {
  @Field(() => OrderStatus, { nullable: true })
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @Field(() => PaymentStatus, { nullable: true })
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @Field(() => PaymentMethod, { nullable: true })
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @Field(() => ShippingCarrier, { nullable: true })
  @IsEnum(ShippingCarrier)
  carrier?: ShippingCarrier;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;

  @Field(() => OrderDateFilterField, { nullable: true })
  @IsOptional()
  @IsEnum(OrderDateFilterField)
  dateType?: OrderDateFilterField;
}
