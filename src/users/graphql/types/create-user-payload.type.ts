import { Field, ObjectType } from '@nestjs/graphql';

import { UserType } from '@/users/graphql/types/user.type';

@ObjectType()
export class CreateUserPayload {
  @Field(() => UserType)
  user!: UserType;

  @Field(() => String, { nullable: true })
  tempPassword?: string | null;
}
