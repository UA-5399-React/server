import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { UpdateMeDto } from './dto/update-me.dto';
import { User, UserDocument } from './entities/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

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
}
