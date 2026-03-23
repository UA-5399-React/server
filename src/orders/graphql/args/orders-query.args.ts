import { ArgsType, Field } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';

import { SortOrder } from '@/common/enums/sort-order.enum';
import { BasePaginationArgs } from '@/graphql/args/base-pagination.args';
import { OrdersSortField } from '@/orders/enums/orders-sort-field.enum';
import { OrdersFilterInput } from '@/orders/graphql/inputs/orders-filter.input';

@ArgsType()
export class OrdersQueryArgs extends BasePaginationArgs {
  @Field(() => OrdersSortField, { defaultValue: OrdersSortField.createdAt })
  @IsEnum(OrdersSortField)
  sort: OrdersSortField = OrdersSortField.createdAt;

  @Field(() => SortOrder, { defaultValue: SortOrder.desc })
  @IsEnum(SortOrder)
  order: SortOrder;

  @Field(() => OrdersFilterInput, { nullable: true })
  @IsOptional()
  filter?: OrdersFilterInput;
}
