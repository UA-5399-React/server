import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

// Stored as a plain snapshot rather than a User ref so that order history
// stays intact even if the user edits their profile or is deleted.

@Schema({ _id: false })
export class OrderUser {
  @ApiProperty({ example: 'John' })
  @Prop({ required: true })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @Prop({ required: true })
  lastName: string;

  @ApiProperty({ example: 'john@example.com' })
  @Prop({ required: true })
  email: string;

  @ApiProperty({ example: '+380501234567' })
  @Prop({ required: true })
  phone: string;
}

export const OrderUserSchema = SchemaFactory.createForClass(OrderUser);
