import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetProductsQueryDto {
  // Optional keyword for searching products by title, description, or tags
  @ApiPropertyOptional({ description: 'Search Keyword', example: 'iphone' })
  @IsOptional()
  @IsString()
  search?: string;

  // Page number for pagination (minimum 1, default is 1)
  @ApiPropertyOptional({ description: 'Page number (1..N)', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  // Number of items per page (limited to prevent large queries)
  @ApiPropertyOptional({ description: 'Items per page', example: 10, default: 10, maximum: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number = 10;
}
