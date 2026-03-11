import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  _id!: string;

  @ApiProperty({ example: 'Laptops' })
  title!: string;

  @ApiPropertyOptional({ example: 'All kinds of laptops' })
  description?: string;

  @ApiPropertyOptional({ example: 'https://images.unsplash.com/...' })
  imageUrl?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439010' })
  parent?: string;

  @ApiProperty({ example: 1, enum: [1, 2] })
  depth!: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}
