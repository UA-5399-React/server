import { ApiProperty } from '@nestjs/swagger';

export class UploadProductImageBodyDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Product image file',
  })
  file: unknown;
}
