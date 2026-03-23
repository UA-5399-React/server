import { ArgsType, Field } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';

import { SortOrder } from '@/common/enums/sort-order.enum';
import { BasePaginationArgs } from '@/graphql/args/base-pagination.args';
import { UsersSortField } from '@/users/enums/users-sort-field.enum';
import { UsersFilterInput } from '@/users/graphql/inputs/users-filter.input';

@ArgsType()
export class UsersQueryArgs extends BasePaginationArgs {
  @Field(() => UsersSortField, { defaultValue: UsersSortField.createdAt })
  @IsEnum(UsersSortField)
  sort: UsersSortField = UsersSortField.createdAt;

  @Field(() => SortOrder, { defaultValue: SortOrder.desc })
  @IsEnum(SortOrder)
  order: SortOrder;

  @Field(() => UsersFilterInput, { nullable: true })
  @IsOptional()
  filter?: UsersFilterInput;
}
