import { SortOrder } from '@/common/enums/sort-order.enum';
import { UsersSortField } from '@/users/enums/users-sort-field.enum';
import { UsersFilterInput } from '@/users/graphql/inputs/users-filter.input';

export type FindUsersQuery = {
  search?: string;
  page?: number;
  limit?: number;
  sort?: UsersSortField;
  order?: SortOrder;
  filter?: UsersFilterInput;
};
