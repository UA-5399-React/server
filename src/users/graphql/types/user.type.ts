import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

import { Role } from '@/users/enums/role.enum';

@ObjectType({ description: 'user' })
export class UserType {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field(() => Role)
  role: Role;

  @Field(() => String, { nullable: true })
  firstName?: string;

  @Field(() => String, { nullable: true })
  lastName?: string;

  @Field(() => String, { nullable: true })
  phone?: string;

  @Field(() => Boolean)
  isActive: boolean;

  @Field(() => GraphQLISODateTime, { nullable: true })
  lastLoginAt?: Date | null;

  @Field(() => String, { nullable: true })
  avatarUrl?: string | null;

  @Field(() => UserType, { nullable: true })
  createdBy?: UserType | null;

  @Field(() => Boolean)
  isEmailConfirmed: boolean;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}
