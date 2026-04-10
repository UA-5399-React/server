import { ApiProperty } from '@nestjs/swagger';

import { ProductListItemDto } from './product-list-item.dto';

export class PaginatedProductsDto {
  // List of products for the current page
  @ApiProperty({ type: [ProductListItemDto] })
  items: ProductListItemDto[];

  // Total number of products matching the search/filter
  @ApiProperty({ example: 125 })
  total: number;

  // Current page number
  @ApiProperty({ example: 1 })
  page: number;

  // Number of items per page
  @ApiProperty({ example: 10 })
  limit: number;

  // Total number of pages calculated from total and limit
  @ApiProperty({ example: 13 })
  totalPages: number;
}
