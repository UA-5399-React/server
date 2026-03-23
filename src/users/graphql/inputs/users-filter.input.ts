import { Field, GraphQLISODateTime, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsOptional } from 'class-validator';

import { Role } from '@/users/enums/role.enum';
import { UserDateFilterField } from '@/users/enums/user-date-filter-field.enum';

@InputType()
export class UsersFilterInput {
  @Field(() => Role, { nullable: true })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isEmailConfirmed?: boolean;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;

  @Field(() => UserDateFilterField, { nullable: true })
  @IsOptional()
  @IsEnum(UserDateFilterField)
  dateType?: UserDateFilterField;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  neverLoggedIn?: boolean;
}
