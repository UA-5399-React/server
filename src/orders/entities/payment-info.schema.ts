import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PaymentMethod, PaymentStatus } from '../enums';

// stripePaymentIntentId lets you look up intents, issue refunds,
// or verify webhooks without extra joins.

@Schema({ _id: false })
export class PaymentInfo {
  @ApiProperty({ enum: PaymentMethod })
  @Prop({ type: String, enum: PaymentMethod, required: true })
  method: PaymentMethod;

  @ApiProperty({ enum: PaymentStatus, default: PaymentStatus.PENDING })
  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @ApiPropertyOptional({ example: 'pi_3QaVk2Cz7...' })
  @Prop()
  stripePaymentIntentId?: string;
}

export const PaymentInfoSchema = SchemaFactory.createForClass(PaymentInfo);
