import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class OrderUserType {
  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field()
  email!: string;

  @Field()
  phone!: string;
}
