import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Role } from '../../../dist 4/users/enums/Role';

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  isEmailConfirmed!: boolean;
}
