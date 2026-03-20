import { ApiProperty } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty({ example: 'success' })
  status!: string;

  @ApiProperty({ example: 'User created successfully.' })
  message!: string;
}
