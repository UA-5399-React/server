import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
  Length,
} from 'class-validator';

import { Trim } from '@/common/decorators/trim.decorator';
import { Match } from '@/users/decorators/match.decorator';

export class SignUpDto {
  @ApiProperty({ example: 'email@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @Trim()
  email!: string;

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

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  @Trim()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  @Trim()
  lastName?: string;
}
