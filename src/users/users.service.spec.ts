import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { CryptoService } from '@/auth/crypto/crypto.service';
import { TokensService } from '@/auth/tokens/tokens.service';
import { CartService } from '@/cart/cart.service';
import { AppLogger } from '@/logger/app-logger.service';
import { MailService } from '@/mailer/mailer.service';
import { CloudinaryService } from '@/uploads/cloudinary.service';
import { User } from '@/users/entities/user.schema';
import { Role } from '@/users/enums/role.enum';

import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockAggregateExec = jest.fn();

  const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn().mockReturnValue({ exec: mockAggregateExec }),
  };

  const mockCryptoService = {
    preparePassword: jest.fn(),
    comparePassword: jest.fn(),
    hashPassword: jest.fn(),
  };

  const mockCloudinaryService = {
    deleteImage: jest.fn(),
  };

  const mailServiceMock = {
    sendTempPassword: jest.fn(),
  };
  const mockTokensService = {
    deleteAllForUser: jest.fn(),
  };

  const mockCartService = {
    clearCart: jest.fn(),
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
          provide: TokensService,
          useValue: mockTokensService,
        },
        {
          provide: CartService,
          useValue: mockCartService,
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
        {
          provide: MailService,
          useValue: mailServiceMock,
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

      mockCryptoService.comparePassword.mockResolvedValue(false);

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

      mockCryptoService.comparePassword.mockResolvedValue(true);

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

      mockCryptoService.comparePassword.mockResolvedValue(true);
      mockCryptoService.hashPassword.mockResolvedValue('newHash');

      await service.changePassword('123', {
        oldPassword: 'old123',
        newPassword: 'new123',
      } as never);

      expect(mockCryptoService.hashPassword).toHaveBeenCalledWith('new123');
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

      expect(result).toEqual({ id: '1', email: 'new@test.com' });
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

  describe('deleteByAdmin', () => {
    it('should delete user by super admin', async () => {
      const targetUserId = 'target-id';
      const currentUser = { id: 'super-id', role: Role.SUPER_ADMIN, email: 'super@test.com' };

      jest
        .spyOn(service, 'findById')
        .mockResolvedValue({ id: targetUserId, role: Role.CUSTOMER } as never);
      mockUserModel.findByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue(true) });

      const result = await service.deleteByAdmin(targetUserId, currentUser);

      expect(result).toBe(true);
      expect(mockTokensService.deleteAllForUser).toHaveBeenCalledWith(targetUserId);
      expect(mockCartService.clearCart).toHaveBeenCalledWith(targetUserId);
      expect(mockUserModel.findByIdAndDelete).toHaveBeenCalledWith(targetUserId);
    });
  });

  describe('getStats', () => {
    it('should return totals and one entry per day for current UTC month', async () => {
      jest.useFakeTimers({ now: new Date(Date.UTC(2026, 3, 11)) });
      mockUserModel.countDocuments.mockResolvedValueOnce(10).mockResolvedValueOnce(7);
      mockAggregateExec.mockResolvedValue([]);

      const result = await service.getStats();

      expect(result.totalUsers).toBe(10);
      expect(result.activeUsers).toBe(7);
      expect(result.blockedUsers).toBe(3);
      expect(result.registrationsYear).toBe(2026);
      expect(result.registrationsMonth).toBe(4);
      expect(result.registrationsByDay).toHaveLength(30);
      expect(result.registrationsByDay[0]).toEqual({ day: 1, date: '2026-04-01', count: 0 });
      expect(result.registrationsByDay[29]).toEqual({ day: 30, date: '2026-04-30', count: 0 });

      expect(mockUserModel.countDocuments).toHaveBeenNthCalledWith(1, { role: Role.CUSTOMER });
      expect(mockUserModel.countDocuments).toHaveBeenNthCalledWith(2, {
        role: Role.CUSTOMER,
        isActive: true,
      });
      expect(mockUserModel.aggregate).toHaveBeenCalled();
      const [[pipeline]] = mockUserModel.aggregate.mock.calls;
      expect(pipeline[0]).toEqual({
        $match: {
          role: Role.CUSTOMER,
          createdAt: { $gte: expect.any(Date), $lt: expect.any(Date) },
        },
      });

      jest.useRealTimers();
    });

    it('should merge aggregation rows into registrationsByDay', async () => {
      mockUserModel.countDocuments.mockResolvedValueOnce(10).mockResolvedValueOnce(7);
      mockAggregateExec.mockResolvedValue([{ _id: '2026-04-05', count: 2 }]);

      const result = await service.getStats(2026, 4);

      expect(result.registrationsByDay[4]).toEqual({ day: 5, date: '2026-04-05', count: 2 });
      expect(result.registrationsByDay[0].count).toBe(0);
    });

    it('should include 29 days for February on a leap year', async () => {
      mockUserModel.countDocuments.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      mockAggregateExec.mockResolvedValue([]);

      const result = await service.getStats(2024, 2);

      expect(result.registrationsByDay).toHaveLength(29);
    });

    it('should reject when only one of year or month is provided', async () => {
      await expect(service.getStats(2026, undefined)).rejects.toThrow(BadRequestException);
      await expect(service.getStats(undefined, 4)).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid month', async () => {
      await expect(service.getStats(2026, 0)).rejects.toThrow(BadRequestException);
      await expect(service.getStats(2026, 13)).rejects.toThrow(BadRequestException);
    });
  });
});
