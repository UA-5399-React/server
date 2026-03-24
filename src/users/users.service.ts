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

import { CryptoService } from '@/auth/crypto/crypto.service';
import { AuthUser } from '@/auth/types/auth-user.type';
import { PaginatedResult } from '@/common/types/paginated-result.type';
import { buildDateFilter } from '@/common/utils/date.utils';
import { buildPaginatedResult, getPagination } from '@/common/utils/pagination.util';
import { buildSort } from '@/common/utils/sorting.util';
import { CreateUserData } from '@/users/dto/create-user.type';
import { UpdateMeDto } from '@/users/dto/update-me.dto';
import { User, UserDocument } from '@/users/entities/user.schema';
import { UserDateFilterField } from '@/users/enums/user-date-filter-field.enum';
import { UsersSortField } from '@/users/enums/users-sort-field.enum';
import { CreateUserInput } from '@/users/graphql/inputs/create-user.input';
import { UpdateUserInput } from '@/users/graphql/inputs/update-user.input';
import { FindUsersQuery } from '@/users/graphql/types/find-users-query.type';
import { buildAdminUpdateData, validateRoleCreation } from '@/users/policies/user-role.policy';
import { UserListItem } from '@/users/types/user-list-item.type';
import { buildUpdateData } from '@/users/utils/build-update-data';

import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly cryptoService: CryptoService,
  ) {}

  async findByEmail(userEmail: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: this.normalizedEmail(userEmail) }).exec();
  }

  async findByEmailForAuth(email: string) {
    return this.userModel.findOne({ email: this.normalizedEmail(email) }).select('+passwordHash');
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
    const updateData = buildUpdateData(dto);

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
    const existingUser = await this.findByEmail(email);
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

  async findByIds(ids: string[]): Promise<UserDocument[]> {
    const objectIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    return this.userModel.find({ _id: { $in: objectIds } }).exec();
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, {
      lastLoginAt: new Date(),
    });
  }

  async findAll(args: FindUsersQuery): Promise<PaginatedResult<UserListItem>> {
    const { page, limit, skip } = getPagination(args.page, args.limit);
    const f = args.filter;
    const filter = {
      ...this.buildSearchFilter(args.search),
      ...this.buildUsersFilter(args),
      ...buildDateFilter(f?.dateFrom, f?.dateTo, f?.dateType, UserDateFilterField.updatedAt),
    };

    const sort = buildSort(args.sort, args.order, UsersSortField.createdAt);

    const [items, total] = await Promise.all([
      this.userModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return buildPaginatedResult(items, total, page, limit);
  }

  private buildSearchFilter(search?: string): Record<string, unknown> {
    const normalizedSearch = search?.trim();

    if (!normalizedSearch) {
      return {};
    }

    return {
      $or: [
        { email: { $regex: normalizedSearch, $options: 'i' } },
        { firstName: { $regex: normalizedSearch, $options: 'i' } },
        { lastName: { $regex: normalizedSearch, $options: 'i' } },
        { phone: { $regex: normalizedSearch, $options: 'i' } },
      ],
    };
  }

  private buildUsersFilter(args: FindUsersQuery): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (args.filter?.role) {
      filter.role = args.filter.role;
    }

    if (typeof args.filter?.isActive === 'boolean') {
      filter.isActive = args.filter.isActive;
    }

    if (typeof args.filter?.isEmailConfirmed === 'boolean') {
      filter.isEmailConfirmed = args.filter.isEmailConfirmed;
    }

    if (typeof args.filter?.neverLoggedIn === 'boolean') {
      filter.lastLoginAt = args.filter.neverLoggedIn ? null : { $ne: null };
    }

    return filter;
  }

  async createByAdmin(
    input: CreateUserInput,
    currentUser: AuthUser,
  ): Promise<{ user: UserListItem; tempPassword: string | null }> {
    await this.ensureEmailNotTaken(input.email);

    validateRoleCreation(input.role, currentUser.role);

    const { rawPassword, passwordHash } = await this.cryptoService.preparePassword(input.password);

    const user = await this.create(
      {
        email: input.email,
        passwordHash,
        role: input.role,
        firstName: input.firstName?.trim(),
        lastName: input.lastName?.trim(),
        phone: input.phone?.trim(),
        isActive: true,
        isEmailConfirmed: true,
      },
      currentUser.id,
    );

    return {
      user,
      tempPassword: input.password ? null : rawPassword,
    };
  }

  async updateByAdmin(input: UpdateUserInput, currentUser: AuthUser): Promise<UserListItem> {
    const user = await this.findById(input.id);

    const updateData = buildAdminUpdateData(input, currentUser, user);

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      input.id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  async getStats(): Promise<{ totalUsers: number; activeUsers: number; blockedUsers: number }> {
    const [totalUsers, activeUsers] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ isActive: true }),
    ]);
    const blockedUsers = totalUsers - activeUsers;
    return { totalUsers, activeUsers, blockedUsers };
  }
}
