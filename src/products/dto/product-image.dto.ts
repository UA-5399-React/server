import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl } from 'class-validator';

export class ProductImageDto {
  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsString()
  @IsUrl({}, { message: 'imageUrl must be a valid URL' })
  imageUrl!: string;

  @ApiProperty({ example: 'products/sample-image' })
  @IsString()
  imagePublicId!: string;
}
