import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

import { Match } from '@/users/decorators/match.decorator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @IsNotEmpty()
  @IsStrongPassword(
    {
      minLength: 8,
      minNumbers: 1,
      minLowercase: 1,
      minUppercase: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password must be at least 8 characters, include uppercase, lowercase, number and symbol',
    },
  )
  password!: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @IsNotEmpty()
  @Match('password', { message: 'Passwords do not match' })
  passwordConfirmation!: string;
}
