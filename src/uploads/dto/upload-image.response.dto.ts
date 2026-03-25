import { ApiProperty } from '@nestjs/swagger';

export class UploadImageResponseDto {
  @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/products/sample.jpg' })
  imageUrl: string;

  @ApiProperty({ example: 'products/sample' })
  imagePublicId: string;
}
