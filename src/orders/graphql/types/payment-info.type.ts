import { Field, ObjectType } from '@nestjs/graphql';

import { PaymentMethod, PaymentStatus } from '@/orders/enums';

@ObjectType()
export class PaymentInfoType {
  @Field(() => PaymentMethod)
  method!: PaymentMethod;

  @Field(() => PaymentStatus)
  status!: PaymentStatus;

  @Field({ nullable: true })
  stripePaymentIntentId?: string;
}
