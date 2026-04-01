import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';

import { CryptoService } from '@/auth/crypto/crypto.service';
import { AppLogger } from '@/logger/app-logger.service';
import { CloudinaryService } from '@/uploads/cloudinary.service';
import { User } from '@/users/entities/user.schema';
import { Role } from '@/users/enums/role.enum';

import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockCryptoService = {
    preparePassword: jest.fn(),
  };

  const mockCloudinaryService = {
    deleteImage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: CryptoService,
          useValue: mockCryptoService,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
        {
          provide: AppLogger, // 👈 ОСЬ ЦЕ ДОДАТИ
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should normalize email and return user', async () => {
      const exec = jest.fn().mockResolvedValue({ email: 'test@test.com' });
      mockUserModel.findOne.mockReturnValue({ exec });

      const result = await service.findByEmail('  TEST@test.com  ');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        email: 'test@test.com',
      });
      expect(result).toEqual({ email: 'test@test.com' });
    });
  });

  describe('findById', () => {
    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.findById('invalid-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user not found', async () => {
      const validId = new Types.ObjectId().toString();
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findById(validId)).rejects.toThrow(NotFoundException);
    });

    it('should return user if found', async () => {
      const validId = new Types.ObjectId().toString();
      const user = { id: validId, email: 'user@test.com' };

      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      });

      await expect(service.findById(validId)).resolves.toEqual(user);
    });
  });

  describe('updateMe', () => {
    it('should throw BadRequestException when dto has no valid fields', async () => {
      await expect(service.updateMe('123', {} as never)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(service.updateMe('123', { firstName: 'Anna' } as never)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update and return user', async () => {
      const updatedUser = { id: '123', firstName: 'Anna' };
      mockUserModel.findByIdAndUpdate.mockResolvedValue(updatedUser);

      await expect(service.updateMe('123', { firstName: 'Anna' } as never)).resolves.toEqual(
        updatedUser,
      );

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          $set: expect.objectContaining({ firstName: 'Anna' }),
        }),
        { new: true, runValidators: true },
      );
    });
  });

  describe('changePassword', () => {
    it('should throw NotFoundException if user not found', async () => {
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        service.changePassword('123', {
          oldPassword: 'old123',
          newPassword: 'new123',
        } as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if old password is incorrect', async () => {
      const user = { passwordHash: 'hash', save: jest.fn() };

      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(user),
        }),
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword('123', {
          oldPassword: 'wrong',
          newPassword: 'new123',
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if new password equals old password', async () => {
      const user = { passwordHash: 'hash', save: jest.fn() };

      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(user),
        }),
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.changePassword('123', {
          oldPassword: 'same123',
          newPassword: 'same123',
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('should hash and save new password', async () => {
      const save = jest.fn();
      const user = { passwordHash: 'oldHash', save };

      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(user),
        }),
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHash');

      await service.changePassword('123', {
        oldPassword: 'old123',
        newPassword: 'new123',
      } as never);

      expect(bcrypt.hash).toHaveBeenCalledWith('new123', 10);
      expect(user.passwordHash).toBe('newHash');
      expect(save).toHaveBeenCalled();
    });
  });

  describe('ensureEmailNotTaken', () => {
    it('should throw ConflictException if email already exists', async () => {
      jest.spyOn(service, 'findByEmail').mockResolvedValue({ id: '1' } as never);

      await expect(service.ensureEmailNotTaken('test@test.com')).rejects.toThrow(ConflictException);
    });

    it('should not throw if email is free', async () => {
      jest.spyOn(service, 'findByEmail').mockResolvedValue(null);

      await expect(service.ensureEmailNotTaken('test@test.com')).resolves.toBeUndefined();
    });
  });

  describe('createByAdmin', () => {
    it('should create user and return tempPassword null when password provided', async () => {
      jest.spyOn(service, 'ensureEmailNotTaken').mockResolvedValue(undefined);
      jest.spyOn(service, 'create').mockResolvedValue({
        id: '1',
        email: 'new@test.com',
      } as never);

      mockCryptoService.preparePassword.mockResolvedValue({
        rawPassword: 'generated-pass',
        passwordHash: 'hashed-pass',
      });

      const result = await service.createByAdmin(
        {
          email: 'new@test.com',
          password: 'secret123',
          role: Role.ADMIN,
          firstName: 'Anna',
          lastName: 'Test',
          phone: '123456789',
        } as never,
        {
          id: 'super-admin-id',
          role: Role.SUPER_ADMIN,
          email: 'super@test.com',
        },
      );

      expect(result).toEqual({
        user: { id: '1', email: 'new@test.com' },
        tempPassword: null,
      });
    });
  });

  describe('updateByAdmin', () => {
    it('should throw BadRequestException if no fields provided', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue({
        id: '1',
        role: Role.CUSTOMER,
      } as never);

      await expect(
        service.updateByAdmin({ id: '1' } as never, {
          id: 'admin-id',
          role: Role.SUPER_ADMIN,
          email: 'admin@test.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    it('should return total, active and blocked users', async () => {
      mockUserModel.countDocuments.mockResolvedValueOnce(10).mockResolvedValueOnce(7);

      await expect(service.getStats()).resolves.toEqual({
        totalUsers: 10,
        activeUsers: 7,
        blockedUsers: 3,
      });

      expect(mockUserModel.countDocuments).toHaveBeenNthCalledWith(1);
      expect(mockUserModel.countDocuments).toHaveBeenNthCalledWith(2, {
        isActive: true,
      });
    });
  });
});
