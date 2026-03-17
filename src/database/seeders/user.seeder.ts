import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';

import { AppLogger } from '@/logger/app-logger.service';
import { User, UserDocument } from '@/users/entities/user.schema';
import { Role } from '@/users/enums/Role';

@Injectable()
export class UserSeeder {
  private readonly logger = new AppLogger();

  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async seed(clear: boolean = false) {
    if (clear) {
      this.logger.log('Clearing existing users...');
      await this.userModel.deleteMany({});
      this.logger.log('Users cleared.');
    }

    this.logger.log('Starting users seeding...');
    const usersToSeed = [
      {
        email: 'superadmin@admin.com',
        password: 'admin123',
        role: Role.SUPER_ADMIN,
        firstName: 'Super',
        lastName: 'Admin',
        isActive: true,
        isEmailConfirmed: true,
      },
      {
        email: 'admin@admin.com',
        password: 'admin123',
        role: Role.ADMIN,
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
        isEmailConfirmed: true,
      },
      {
        email: 'customer@test.com',
        password: 'customer123',
        role: Role.CUSTOMER,
        firstName: 'Test',
        lastName: 'Customer',
        isActive: true,
        isEmailConfirmed: true,
        phone: '+380671234567',
        avatarUrl:
          'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800&h=1200&fit=crop',
      },
    ];

    let createdCount = 0;

    for (const userData of usersToSeed) {
      const existingUser = await this.userModel.findOne({ email: userData.email });

      if (existingUser && !clear) {
        this.logger.log(`User ${userData.email} already exists. Skipping...`);
        continue;
      }

      const passwordHash = await bcrypt.hash(userData.password, 10);

      await this.userModel.create({
        email: userData.email,
        passwordHash,
        role: userData.role,
        firstName: userData.firstName,
        lastName: userData.lastName,
        isActive: userData.isActive,
        isEmailConfirmed: userData.isEmailConfirmed,
      });

      createdCount++;
      this.logger.log(`Created user: ${userData.email} (${userData.role})`);
    }
    this.logger.log(`Successfully seeded ${createdCount} users.`);
  }
}
