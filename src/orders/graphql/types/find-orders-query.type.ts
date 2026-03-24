import { SortOrder } from '@/common/enums/sort-order.enum';
import { OrdersSortField } from '@/orders/enums/orders-sort-field.enum';
import { OrdersFilterInput } from '@/orders/graphql/inputs/orders-filter.input';

export type FindOrdersQuery = {
  search?: string;
  page?: number;
  limit?: number;
  sort?: OrdersSortField;
  order?: SortOrder;
  filter?: OrdersFilterInput;
};
