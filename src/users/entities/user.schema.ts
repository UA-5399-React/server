import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HydratedDocument, Types } from 'mongoose';

import { Role } from '@/users/enums/Role';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @ApiProperty({ example: 'email@example.com' })
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email!: string;

  @ApiProperty({ example: 'hashed_password' })
  @Prop({ required: true, select: false })
  passwordHash!: string;

  @ApiProperty({ enum: Role })
  @Prop({ type: String, enum: Role, default: Role.CUSTOMER })
  role!: Role;

  @ApiProperty({ example: 'John' })
  @Prop({ trim: true })
  firstName?: string;

  @ApiProperty({ example: 'Doe' })
  @Prop({ trim: true })
  lastName?: string;

  @ApiPropertyOptional({ example: '+380...' })
  @Prop({ trim: true })
  phone?: string;

  @ApiProperty({ example: 'true' })
  @Prop({ default: true })
  isActive!: boolean;

  @ApiPropertyOptional()
  @Prop()
  lastLoginAt?: Date;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @Prop({ trim: true })
  avatarUrl?: string;

  @ApiPropertyOptional()
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy?: Types.ObjectId;

  @ApiProperty({ example: true })
  @Prop({ default: false })
  isEmailConfirmed!: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
