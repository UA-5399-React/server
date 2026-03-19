import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CreateUserData } from '@/users/dto/create-user.type';
import { User, UserDocument } from '@/users/entities/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

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

  private normalizedEmail(email: string) {
    return email.trim().toLowerCase();
  }

  async ensureEmailNotTaken(email: string): Promise<void> {
    const existingUser = await this.findByEmail(this.normalizedEmail(email));
    console.log(existingUser);
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid user id: "${id}"`);
    }
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return user;
  }
}
