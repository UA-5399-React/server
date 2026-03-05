import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';

import { Product } from '../entities/product.schema';

@ObjectType()
export class PaginatedProductsDto {
  // List of products for the current page
  @ApiProperty({ type: [Product] })
  @Field(() => [Product])
  items: Product[];

  // Total number of products matching the search/filter
  @ApiProperty({ example: 125 })
  @Field(() => Int)
  total: number;

  // Current page number
  @ApiProperty({ example: 1 })
  @Field(() => Int)
  page: number;

  // Number of items per page
  @ApiProperty({ example: 10 })
  @Field(() => Int)
  limit: number;

  // Total number of pages calculated from total and limit
  @ApiProperty({ example: 13 })
  @Field(() => Int)
  totalPages: number;
}
