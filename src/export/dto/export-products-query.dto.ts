import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ExportProductsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by product status', example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Search by title, description or productCode',
    example: 'iphone',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Filter by category IDs',
    example: ['69b1aa3ac9a8f9dfe1d2300d'],
  })
  @IsOptional()
  @IsString({ each: true })
  category?: string | string[];

  @ApiPropertyOptional({ description: 'Minimum price filter', example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum price filter', example: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Date field to filter on',
    enum: ['createdAt', 'updatedAt'],
    example: 'createdAt',
  })
  @IsOptional()
  @IsString()
  dateType?: string;

  @ApiPropertyOptional({
    description: 'Start date (ISO string)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  updatedFrom?: Date;

  @ApiPropertyOptional({
    description: 'End date (ISO string)',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  updatedTo?: Date;
}
