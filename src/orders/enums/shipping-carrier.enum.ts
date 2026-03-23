import { registerEnumType } from '@nestjs/graphql';

export enum ShippingCarrier {
  NOVA_POST = 'nova_post',
  UKRPOSHTA = 'ukrposhta',
  MEEST = 'meest',
}

registerEnumType(ShippingCarrier, { name: 'ShippingCarrier' });
