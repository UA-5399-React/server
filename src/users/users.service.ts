import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';

import { CreateUserData } from '@/users/dto/create-user.type';
import { UpdateMeDto } from '@/users/dto/update-me.dto';
import { User, UserDocument } from '@/users/entities/user.schema';

import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findByEmail(userEmail: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: this.normalizedEmail(userEmail) }).exec();
  }

  async findByEmailForAuth(email: string) {
    return this.userModel.findOne({ email }).select('+passwordHash');
  }

  async create(data: CreateUserData, createdBy?: string): Promise<UserDocument> {
    const createdUser = new this.userModel({
      ...data,
      email: this.normalizedEmail(data.email),
      createdBy: createdBy || null,
    });

    return await createdUser.save();
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<UserDocument> {
    const updateData: Partial<User> = {};

    if (dto.firstName !== undefined) {
      updateData.firstName = dto.firstName.trim();
    }

    if (dto.lastName !== undefined) {
      updateData.lastName = dto.lastName.trim();
    }

    if (dto.phone !== undefined) {
      updateData.phone = dto.phone.trim();
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userModel.findById(userId).select('+passwordHash').exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isOldPasswordValid = await bcrypt.compare(dto.oldPassword, user.passwordHash);

    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Old password is incorrect');
    }

    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from old password');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    user.passwordHash = newPasswordHash;
    await user.save();
  }

  private normalizedEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async ensureEmailNotTaken(email: string): Promise<void> {
    const existingUser = await this.findByEmail(this.normalizedEmail(email));
    console.log(existingUser);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }
  }

  async findById(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid user id: "${id}"`);
    }
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return user;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, {
      lastLoginAt: new Date(),
    });
  }
}
