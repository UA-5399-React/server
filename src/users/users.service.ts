import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CryptoService } from '@/auth/crypto/crypto.service';
import { TokensService } from '@/auth/tokens/tokens.service';
import { AuthUser } from '@/auth/types/auth-user.type';
import { GoogleAuthUser } from '@/auth/types/google-auth-user.type';
import { CartService } from '@/cart/cart.service';
import { PaginatedResult } from '@/common/types/paginated-result.type';
import { buildDateFilter } from '@/common/utils/date.utils';
import { buildPaginatedResult, getPagination } from '@/common/utils/pagination.util';
import { buildSort } from '@/common/utils/sorting.util';
import { AppLogger } from '@/logger/app-logger.service';
import { MailService } from '@/mailer/mailer.service';
import { CloudinaryService } from '@/uploads/cloudinary.service';
import { CreateUserData } from '@/users/dto/create-user.type';
import { GoogleUserUpdateData } from '@/users/dto/google-user-update-data.type';
import { UpdateMeDto } from '@/users/dto/update-me.dto';
import { User, UserDocument } from '@/users/entities/user.schema';
import { Role } from '@/users/enums/role.enum';
import { UserDateFilterField } from '@/users/enums/user-date-filter-field.enum';
import { UsersSortField } from '@/users/enums/users-sort-field.enum';
import { CreateUserInput } from '@/users/graphql/inputs/create-user.input';
import { UpdateUserInput } from '@/users/graphql/inputs/update-user.input';
import { FindUsersQuery } from '@/users/graphql/types/find-users-query.type';
import {
  buildAdminUpdateData,
  validateRoleCreation,
  validateUserDeletion,
} from '@/users/policies/user-role.policy';
import { UserListItem } from '@/users/types/user-list-item.type';
import { buildUpdateData } from '@/users/utils/build-update-data';

import { ChangePasswordDto } from './dto/change-password.dto';
import { UserRegistrationDayType } from './graphql/types/user-registration-day.type';
import { UserRegistrationTimeseriesType } from './graphql/types/user-registration-timeseries.type';
import { UserStatsType } from './graphql/types/user-stats.type';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly cryptoService: CryptoService,
    private readonly logger: AppLogger,
    private readonly cloudinaryService: CloudinaryService,
    private readonly mailService: MailService,
    private readonly tokensService: TokensService,
    private readonly cartService: CartService,
  ) {}

  async findByEmail(userEmail: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: this.normalizedEmail(userEmail) }).exec();
  }

  async findByEmailForAuth(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: this.normalizedEmail(email) })
      .select('+passwordHash')
      .exec();
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

    if (!user.passwordHash) {
      throw new ForbiddenException('Password is not set for this account');
    }

    const isOldPasswordValid = await this.cryptoService.comparePassword(
      dto.oldPassword,
      user.passwordHash,
    );

    if (!isOldPasswordValid) {
      throw new BadRequestException('Old password is incorrect');
    }

    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from old password');
    }

    const newPasswordHash = await this.cryptoService.hashPassword(dto.newPassword);

    user.passwordHash = newPasswordHash;
    await user.save();
  }

  private normalizedEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async updateAvatar(
    userId: string,
    avatarUrl: string,
    avatarPublicId: string,
  ): Promise<UserDocument> {
    const user = await this.findById(userId);
    const oldAvatarPublicId = user.avatarPublicId;

    user.avatarUrl = avatarUrl;
    user.avatarPublicId = avatarPublicId;

    await user.save();

    if (oldAvatarPublicId && oldAvatarPublicId !== avatarPublicId) {
      await this.cloudinaryService.deleteImage(oldAvatarPublicId).catch(() => null);
    }

    return user;
  }

  async ensureEmailNotTaken(email: string): Promise<void> {
    const existingUser = await this.findByEmail(email);
    if (!existingUser) {
      return;
    }

    if (!existingUser.isEmailConfirmed) {
      throw new ConflictException({
        message: 'Email is already registered but not confirmed',
        code: 'EMAIL_NOT_CONFIRMED',
      });
    }

    throw new ConflictException({
      message: 'Email already in use',
      code: 'EMAIL_ALREADY_IN_USE',
    });
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

    const isAutoGeneratedPassword = !input.password;
    const { rawPassword, passwordHash } = await this.cryptoService.preparePassword(input.password);

    const user = await this.create(
      {
        email: input.email,
        passwordHash,
        role: input.role,
        firstName: input.firstName?.trim(),
        lastName: input.lastName?.trim(),
        phone: input.phone?.trim(),
        avatarUrl: input.avatarUrl?.trim(),
        isActive: true,
        isEmailConfirmed: true,
      },
      currentUser.id,
    );

    if (isAutoGeneratedPassword) {
      try {
        await this.mailService.sendTempPassword(input.email, rawPassword);
      } catch {
        // email delivery failed — user was created, tempPassword returned to admin directly
      }
      return { user, tempPassword: rawPassword };
    }

    return { user, tempPassword: null };
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

  async deleteByAdmin(id: string, currentUser: AuthUser): Promise<boolean> {
    const targetUser = await this.findById(id);

    validateUserDeletion(currentUser.role, targetUser, currentUser);

    await this.tokensService.deleteAllForUser(id);
    await this.cartService.clearCart(id);

    // Only hard delete the underlying target user. Related artifacts like Orders are kept as per requirements.
    await this.userModel.findByIdAndDelete(id).exec();

    return true;
  }

  async getStats(year?: number, month?: number): Promise<UserStatsType> {
    const { y, m } = this.resolveRegistrationCalendarMonth(year, month);
    const monthStart = new Date(Date.UTC(y, m - 1, 1));
    const monthEndExclusive = new Date(Date.UTC(y, m, 1));

    const [totalUsers, activeUsers, aggRows] = await Promise.all([
      this.userModel.countDocuments({ role: Role.CUSTOMER }),
      this.userModel.countDocuments({ role: Role.CUSTOMER, isActive: true }),
      this.userModel
        .aggregate<{ _id: string; count: number }>([
          {
            $match: {
              role: Role.CUSTOMER,
              createdAt: { $gte: monthStart, $lt: monthEndExclusive },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' },
              },
              count: { $sum: 1 },
            },
          },
        ])
        .exec(),
    ]);

    const blockedUsers = totalUsers - activeUsers;

    return {
      totalUsers,
      activeUsers,
      blockedUsers,
      registrationsYear: y,
      registrationsMonth: m,
      registrationsByDay: this.buildRegistrationDaysUtc(y, m, aggRows),
    };
  }

  private resolveRegistrationCalendarMonth(
    year?: number,
    month?: number,
  ): { y: number; m: number } {
    if (year === undefined && month === undefined) {
      const now = new Date();
      return { y: now.getUTCFullYear(), m: now.getUTCMonth() + 1 };
    }

    if (year === undefined || month === undefined) {
      throw new BadRequestException('year and month must both be provided or both omitted');
    }

    if (!Number.isInteger(year) || !Number.isInteger(month)) {
      throw new BadRequestException('year and month must be integers');
    }

    if (month < 1 || month > 12) {
      throw new BadRequestException('month must be between 1 and 12');
    }

    if (year < 1970 || year > 2100) {
      throw new BadRequestException('year is out of allowed range');
    }

    return { y: year, m: month };
  }

  private buildRegistrationDaysUtc(
    year: number,
    month: number,
    rows: { _id: string; count: number }[],
  ): UserRegistrationDayType[] {
    const byDate = new Map(rows.map((r) => [r._id, r.count]));
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    const out: UserRegistrationDayType[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${ym}-${String(day).padStart(2, '0')}`;
      out.push({ day, date, count: byDate.get(date) ?? 0 });
    }

    return out;
  }

  async getRegistrationTimeseries(
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<UserRegistrationTimeseriesType> {
    const match: Record<string, unknown> = {};

    if (dateFrom || dateTo) {
      match['createdAt'] = {
        ...(dateFrom ? { $gte: dateFrom } : {}),
        ...(dateTo ? { $lte: dateTo } : {}),
      };
    }

    const result = await this.userModel.aggregate<{ _id: string; count: number }>([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return { data: result.map(({ _id, count }) => ({ month: _id, count })) };
  }

  async updateById(id: string, data: Partial<User>): Promise<UserDocument> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  // Google User

  async findByIdForAuth(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('+passwordHash +googleId').exec();
  }

  async findByGoogleId(googleId: string) {
    return this.userModel.findOne({ googleId: googleId }).exec();
  }

  async findOrCreateGoogleUser(googleUser: GoogleAuthUser): Promise<UserDocument> {
    const { email, firstName, lastName, googleId, avatarUrl } = googleUser;

    let user = await this.findByGoogleId(googleId);

    if (user && user.email !== email) {
      this.logger.security('Google account linked to existing user', {
        email,
        userId: user.id,
      });
      throw new ConflictException('Google account is already linked to another user');
    }

    if (!user) {
      user = await this.findByEmail(email);
    }

    if (!user) {
      const createdUser = new this.userModel({
        email,
        firstName: firstName ?? email.split('@')[0],
        lastName,
        googleId,
        avatarUrl,
        isEmailConfirmed: true,
      });
      return createdUser.save();
    }

    if (!user.isActive) {
      throw new ForbiddenException('Your account is deactivated');
    }

    const updateData: Partial<GoogleUserUpdateData> = {};
    if (!user.googleId) updateData.googleId = googleId;
    if (!user.isEmailConfirmed) updateData.isEmailConfirmed = true;
    if (!user.firstName && firstName) updateData.firstName = firstName;
    if (!user.lastName && lastName) updateData.lastName = lastName;
    if (!user.avatarUrl && avatarUrl) updateData.avatarUrl = avatarUrl;

    if (Object.keys(updateData).length > 0) {
      user = await this.updateById(user.id, updateData);
    }
    return user;
  }

  async disconnectGoogleById(userId: string): Promise<void> {
    await this.userModel.updateOne({ _id: userId }, { $unset: { googleId: 1 } });
  }
}
