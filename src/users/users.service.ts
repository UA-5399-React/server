import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateUserData } from '@/users/dto/create-user.type';
import { UpdateMeDto } from '@/users/dto/update-me.dto';
import { User, UserDocument } from '@/users/entities/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findByEmail(userEmail: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: this.normalizedEmail(userEmail) }).exec();
  }

  async ensureEmailNotTaken(email: string): Promise<void> {
    const existingUser = await this.findByEmail(this.normalizedEmail(email));

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }
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

  private normalizedEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
