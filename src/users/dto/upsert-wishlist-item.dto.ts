import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class UpsertWishlistItemDto {
  @ApiProperty({ example: '66124560cceb1a2a6c8f61c3' })
  @IsString()
  @IsMongoId()
  productId!: string;

  @ApiProperty({ example: 'Nike Air Max 90' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 129.99 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 'https://example.com/images/nike-air-max-90.jpg' })
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'image must be a valid URL' })
  image?: string;
}
