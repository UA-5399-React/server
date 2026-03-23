import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

import { Trim } from '@/common/decorators/trim.decorator';
import { Role } from '@/users/enums/role.enum';

@InputType()
export class UpdateUserInput {
  @Field()
  @IsString()
  id: string;

  @Field(() => Role, { nullable: true })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @Field({ nullable: true })
  @IsOptional()
  @Trim()
  @IsString()
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Trim()
  @IsString()
  lastName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field({ nullable: true })
  @Trim()
  @IsString()
  @IsOptional()
  @IsUrl({}, { message: 'avatarUrl must be a valid URL' })
  avatarUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isEmailConfirmed?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
