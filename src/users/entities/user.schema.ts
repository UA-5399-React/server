import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HydratedDocument, Types } from 'mongoose';

import { Role } from '@/users/enums/role.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({ _id: false })
export class WishlistItem {
  @ApiProperty({ example: '66124560cceb1a2a6c8f61c3' })
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId!: Types.ObjectId;

  @ApiProperty({ example: 'Nike Air Max 90' })
  @Prop({ required: true, trim: true })
  title!: string;

  @ApiProperty({ example: 129.99 })
  @Prop({ required: true, min: 0 })
  price!: number;

  @ApiPropertyOptional({ example: 'https://example.com/images/nike-air-max-90.jpg' })
  @Prop({ trim: true })
  image?: string;
}

export const WishlistItemSchema = SchemaFactory.createForClass(WishlistItem);

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
  @Prop({ required: true, trim: true })
  firstName!: string;

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

  @ApiProperty({ type: [WishlistItem], default: [] })
  @Prop({ type: [WishlistItemSchema], default: [] })
  wishlist!: WishlistItem[];

  readonly createdAt!: Date;
  readonly updatedAt!: Date;

  @Prop({ required: false, unique: true, sparse: true })
  googleId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
