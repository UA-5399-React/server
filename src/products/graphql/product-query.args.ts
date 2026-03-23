import { ArgsType, Field } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';

import { SortOrder } from '@/common/enums/sort-order.enum';
import { BasePaginationArgs } from '@/graphql/args/base-pagination.args';
import { ProductSortField } from '@/products/enums/product-sort-field.enum';
import { ProductsFilterInput } from '@/products/graphql/product-filter.input';

@ArgsType()
export class ProductsQueryArgs extends BasePaginationArgs {
  @Field(() => ProductSortField, { defaultValue: ProductSortField.updatedAt })
  @IsEnum(ProductSortField)
  sort?: ProductSortField = ProductSortField.updatedAt;

  @Field(() => SortOrder, { defaultValue: SortOrder.desc })
  @IsEnum(SortOrder)
  order?: SortOrder;

  @Field(() => ProductsFilterInput, { nullable: true })
  @IsOptional()
  filter?: ProductsFilterInput;
}
