import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Role } from '@/users/enums/role.enum';

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

  @ApiPropertyOptional()
  avatarPublicId?: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  isEmailConfirmed!: boolean;
}
