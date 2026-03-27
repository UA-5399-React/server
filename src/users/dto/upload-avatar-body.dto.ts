import { ApiProperty } from '@nestjs/swagger';

export class UploadAvatarBodyDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Avatar image file',
  })
  file: unknown;
}
