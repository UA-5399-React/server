import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HydratedDocument, Types } from 'mongoose';

import { Role } from '@/users/enums/role.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @ApiProperty({ example: 'email@example.com' })
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email!: string;

  @ApiProperty({ example: 'hashed_password' })
  @Prop({ required: false, select: false })
  passwordHash?: string;

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

  @ApiPropertyOptional({ example: 'avatars/avatar-123456' })
  @Prop({ trim: true })
  avatarPublicId?: string;

  @ApiPropertyOptional()
  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  createdBy?: Types.ObjectId | null;

  @ApiProperty({ example: true })
  @Prop({ default: false })
  isEmailConfirmed!: boolean;

  readonly createdAt!: Date;
  readonly updatedAt!: Date;

  @Prop({ required: false, unique: true, sparse: true })
  googleId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
