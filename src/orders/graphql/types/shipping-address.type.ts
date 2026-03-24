import { Field, ObjectType } from '@nestjs/graphql';

import { ShippingCarrier } from '@/orders/enums';

@ObjectType()
export class ShippingAddressType {
  @Field(() => ShippingCarrier)
  carrier!: ShippingCarrier;

  @Field()
  city!: string;

  @Field()
  branchNumber!: string;
}
