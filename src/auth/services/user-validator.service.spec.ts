import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AppLogger } from '@/logger/app-logger.service';
import { UserDocument } from '@/users/entities/user.schema';
import { Role } from '@/users/enums/role.enum';

import { UserValidatorService } from './user-validator.service';

const loggerMock = {
  security: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

const mockUser: UserDocument = {
  id: 'user_id',
  email: 'test@example.com',
  role: Role.CUSTOMER,
  isActive: true,
  isEmailConfirmed: true,
  googleId: 'google-123',
  passwordHash: 'hashed-password',
} as UserDocument;

describe('UserValidatorService', () => {
  let service: UserValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserValidatorService, { provide: AppLogger, useValue: loggerMock }],
    }).compile();

    service = module.get<UserValidatorService>(UserValidatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureUserExists', () => {
    it('should return user if exists', () => {
      expect(service.ensureUserExists(mockUser)).toBe(mockUser);
    });

    it('should throw UnauthorizedException if user is null', () => {
      expect(() => service.ensureUserExists(null)).toThrow(UnauthorizedException);
    });
  });

  describe('ensureActive', () => {
    it('should not throw if user is active', () => {
      expect(() => service.ensureActive(mockUser)).not.toThrow();
    });

    it('should throw ForbiddenException if user is inactive', () => {
      const inactiveUser = { ...mockUser, isActive: false } as unknown as UserDocument;
      expect(() => service.ensureActive(inactiveUser)).toThrow(ForbiddenException);
      expect(loggerMock.security).toHaveBeenCalledWith('Blocked inactive user access', {
        id: inactiveUser.id,
        email: inactiveUser.email,
        role: inactiveUser.role,
      });
    });
  });

  describe('ensureEmailConfirmed', () => {
    it('should not throw if email is confirmed', () => {
      expect(() => service.ensureEmailConfirmed(mockUser)).not.toThrow();
    });

    it('should throw UnauthorizedException if email not confirmed', () => {
      const unconfirmedUser = { ...mockUser, isEmailConfirmed: false } as unknown as UserDocument;
      expect(() => service.ensureEmailConfirmed(unconfirmedUser)).toThrow(UnauthorizedException);
      expect(loggerMock.security).toHaveBeenCalledWith('Login blocked: email not confirmed', {
        id: unconfirmedUser.id,
        email: unconfirmedUser.email,
      });
    });
  });

  describe('ensureGoogleConnected', () => {
    it('should not throw if googleId exists', () => {
      expect(() => service.ensureGoogleConnected(mockUser)).not.toThrow();
    });

    it('should throw ConflictException if googleId is missing', () => {
      const noGoogleUser = { ...mockUser, googleId: undefined } as unknown as UserDocument;
      expect(() => service.ensureGoogleConnected(noGoogleUser)).toThrow(ConflictException);
    });
  });

  describe('ensureHasPassword', () => {
    it('should not throw if passwordHash exists', () => {
      expect(() => service.ensureHasPassword(mockUser)).not.toThrow();
    });

    it('should throw BadRequestException if passwordHash is missing', () => {
      const noPasswordUser = { ...mockUser, passwordHash: undefined } as unknown as UserDocument;
      expect(() => service.ensureHasPassword(noPasswordUser)).toThrow(BadRequestException);
    });
  });
});
