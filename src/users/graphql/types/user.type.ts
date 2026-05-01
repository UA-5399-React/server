import { Field, Float, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

import { Role } from '@/users/enums/role.enum';

@ObjectType({ description: 'wishlist item' })
class WishlistItemType {
  @Field(() => ID)
  productId: string | { toString(): string };

  @Field(() => String)
  title: string;

  @Field(() => Float)
  price: number;

  @Field(() => String, { nullable: true })
  image?: string | null;
}

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

  @Field(() => [WishlistItemType], { defaultValue: [] })
  wishlist: WishlistItemType[];
}
