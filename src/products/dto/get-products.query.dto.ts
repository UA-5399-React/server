import { ArgsType, Field, Int } from '@nestjs/graphql';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

@ArgsType()
export class GetProductsQueryDto {
  // Optional keyword for searching products by title, description, or tags
  @ApiPropertyOptional({ description: 'Search Keyword', example: 'iphone' })
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  // Page number for pagination (minimum 1, default is 1)
  @ApiPropertyOptional({ description: 'Page number (1..N)', example: 1, default: 1 })
  @Field(() => Int, { defaultValue: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  // Number of items per page (limited to prevent large queries)
  @ApiPropertyOptional({ description: 'Items per page', example: 10, default: 10, maximum: 30 })
  @Field(() => Int, { defaultValue: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  limit?: number = 10;

  //Sorting field, could be sorted by title or price
  @ApiPropertyOptional({
    description: 'By what field result be sorted: title or price',
    example: 'title',
    enum: ['price', 'title'],
  })
  @IsOptional()
  @IsIn(['price', 'title'])
  sort?: 'price' | 'title';

  //Ascended ot descended order of sorting, by default it's from lower to higher
  @ApiPropertyOptional({
    description: 'Sorting order: ascended or descended',
    example: 'asc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'asc';

  // Category filter (stored in the product tags array)
  @ApiPropertyOptional({ example: 'electronics', description: 'Category (stored in tags[])' })
  @IsOptional()
  @IsString()
  category?: string;

  // Minimum price filter for products
  @ApiPropertyOptional({ example: 100, description: 'Minimum product price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  // Maximum price filter for products
  @ApiPropertyOptional({ example: 1000, description: 'Maximum product price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;
}
