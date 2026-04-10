import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsEnum, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

import { Trim } from '@/common/decorators/trim.decorator';
import { Role } from '@/users/enums/role.enum';

@InputType()
export class CreateUserInput {
  @Field()
  @Trim()
  @IsEmail()
  email!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @Field(() => Role)
  @IsEnum(Role)
  role!: Role;

  @Field({ nullable: true })
  @IsOptional()
  @Trim()
  @IsString()
  firstName!: string;

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
}
