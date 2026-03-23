import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

import { ShippingCarrier } from '../enums';

@Schema({ _id: false })
export class ShippingAddress {
  @ApiProperty({ enum: ShippingCarrier, example: ShippingCarrier.NOVA_POST })
  @Prop({ type: String, enum: ShippingCarrier, required: true })
  carrier: ShippingCarrier;

  @ApiProperty({ example: 'Kyiv' })
  @Prop({ required: true })
  city: string;

  @ApiProperty({ example: '42', description: 'Branch / post office number' })
  @Prop({ required: true })
  branchNumber: string;
}

export const ShippingAddressSchema = SchemaFactory.createForClass(ShippingAddress);
