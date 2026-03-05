import { ArgsType, Field, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { ProductSortField } from '@/products/enums/product-sort-field.enum';
import { SortOrder } from '@/products/enums/sort-order.enum';
import { ProductsFilterInput } from '@/products/graphql/product-filter.input';

@ArgsType()
export class ProductsQueryArgs {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => Int, { defaultValue: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @Field(() => Int, { defaultValue: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

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
