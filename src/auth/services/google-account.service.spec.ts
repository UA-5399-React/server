import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { AuthService } from '@/auth/auth.service';
import { GOOGLE_CONNECT_TOKEN_TYPE } from '@/auth/constants';
import { GoogleAccountService } from '@/auth/services/google-account.service';
import { UserValidatorService } from '@/auth/services/user-validator.service';
import { GoogleAuthUser } from '@/auth/types/google-auth-user.type';
import { AppLogger } from '@/logger/app-logger.service';
import { Role } from '@/users/enums/role.enum';
import { UsersService } from '@/users/users.service';

const jwtServiceMock = {
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
};

const configServiceMock = {
  getOrThrow: jest.fn(),
};

const usersServiceMock = {
  findOrCreateGoogleUser: jest.fn(),
  findById: jest.fn(),
  findByGoogleId: jest.fn(),
  updateById: jest.fn(),
  findByIdForAuth: jest.fn(),
  disconnectGoogleById: jest.fn(),
};

const loggerMock = {
  security: jest.fn(),
};

const userValidatorServiceMock = {
  ensureUserExists: jest.fn(),
  ensureActive: jest.fn(),
  ensureGoogleConnected: jest.fn(),
  ensureHasPassword: jest.fn(),
};

const authServiceMock = {
  generateTokens: jest.fn(),
};
const googleUser = {
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  googleId: 'google-123',
  avatarUrl: 'https://example.com/avatar.png',
} as GoogleAuthUser;

describe('GoogleAccountService', () => {
  let service: GoogleAccountService;

  const createUser = (overrides = {}) => ({
    id: 'user-id',
    email: 'test@example.com',
    role: Role.CUSTOMER,
    isActive: true,
    googleId: undefined,
    passwordHash: 'hashed-password',
    ...overrides,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleAccountService,
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
        { provide: AppLogger, useValue: loggerMock },
        { provide: UserValidatorService, useValue: userValidatorServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    }).compile();

    service = module.get<GoogleAccountService>(GoogleAccountService);
  });

  describe('handleGoogleLogin', () => {
    it('should find or create google user, validate active state and generate tokens', async () => {
      const user = createUser();
      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      usersServiceMock.findOrCreateGoogleUser.mockResolvedValue(user);
      authServiceMock.generateTokens.mockResolvedValue(tokens);

      const result = await service.handleGoogleLogin(googleUser);

      expect(usersServiceMock.findOrCreateGoogleUser).toHaveBeenCalledWith(googleUser);
      expect(userValidatorServiceMock.ensureActive).toHaveBeenCalledWith(user);
      expect(authServiceMock.generateTokens).toHaveBeenCalledWith({
        id: user.id,
        email: user.email,
        role: user.role,
      });
      expect(result).toEqual(tokens);
    });
  });

  describe('connectGoogleAccount', () => {
    it('should connect google account successfully', async () => {
      const currentUser = createUser({
        id: 'current-user-id',
        email: 'test@example.com',
        googleId: undefined,
      });

      usersServiceMock.findById.mockResolvedValue(currentUser);
      usersServiceMock.findByGoogleId.mockResolvedValue(null);
      usersServiceMock.updateById.mockResolvedValue(undefined);

      await service.connectGoogleAccount('current-user-id', googleUser);

      expect(usersServiceMock.findById).toHaveBeenCalledWith('current-user-id');
      expect(userValidatorServiceMock.ensureActive).toHaveBeenCalledWith(currentUser);
      expect(usersServiceMock.findByGoogleId).toHaveBeenCalledWith(googleUser.googleId);
      expect(usersServiceMock.updateById).toHaveBeenCalledWith(currentUser.id, {
        googleId: googleUser.googleId,
        isEmailConfirmed: true,
      });
    });

    it('should throw if google account is already linked to another user', async () => {
      const currentUser = createUser({
        id: 'current-user-id',
        email: 'test@example.com',
      });
      const existingGoogleUser = createUser({
        id: 'another-user-id',
        email: 'another@example.com',
        googleId: googleUser.googleId,
      });

      usersServiceMock.findById.mockResolvedValue(currentUser);
      usersServiceMock.findByGoogleId.mockResolvedValue(existingGoogleUser);

      await expect(service.connectGoogleAccount('current-user-id', googleUser)).rejects.toThrow(
        new ConflictException('Google account is already linked to another user'),
      );

      expect(loggerMock.security).toHaveBeenCalledWith('Google account linked to existing user', {
        email: googleUser.email,
        userId: existingGoogleUser.id,
      });
      expect(usersServiceMock.updateById).not.toHaveBeenCalled();
    });

    it('should throw if another google account is already linked to this user', async () => {
      const currentUser = createUser({
        id: 'current-user-id',
        email: 'test@example.com',
        googleId: 'another-google-id',
      });

      usersServiceMock.findById.mockResolvedValue(currentUser);
      usersServiceMock.findByGoogleId.mockResolvedValue(null);

      await expect(service.connectGoogleAccount('current-user-id', googleUser)).rejects.toThrow(
        new ConflictException('Another Google account is already linked to this user'),
      );

      expect(usersServiceMock.updateById).not.toHaveBeenCalled();
    });

    it('should throw if google email does not match current account email', async () => {
      const currentUser = createUser({
        id: 'current-user-id',
        email: 'other@example.com',
      });

      usersServiceMock.findById.mockResolvedValue(currentUser);
      usersServiceMock.findByGoogleId.mockResolvedValue(null);

      await expect(service.connectGoogleAccount('current-user-id', googleUser)).rejects.toThrow(
        new BadRequestException('Google email does not match current account email'),
      );

      expect(usersServiceMock.updateById).not.toHaveBeenCalled();
    });
  });

  describe('disconnectGoogleAccount', () => {
    it('should disconnect google account successfully', async () => {
      const foundUser = createUser({
        id: 'user-id',
        googleId: 'google-123',
        passwordHash: 'hashed-password',
      });

      const authUser = {
        id: 'user-id',
        email: 'test@example.com',
        role: Role.CUSTOMER,
      };

      usersServiceMock.findByIdForAuth.mockResolvedValue(foundUser);
      userValidatorServiceMock.ensureUserExists.mockReturnValue(foundUser);
      usersServiceMock.disconnectGoogleById.mockResolvedValue(undefined);

      const result = await service.disconnectGoogleAccount(authUser);

      expect(usersServiceMock.findByIdForAuth).toHaveBeenCalledWith(authUser.id);
      expect(userValidatorServiceMock.ensureUserExists).toHaveBeenCalledWith(foundUser);
      expect(userValidatorServiceMock.ensureActive).toHaveBeenCalledWith(foundUser);
      expect(userValidatorServiceMock.ensureGoogleConnected).toHaveBeenCalledWith(foundUser);
      expect(userValidatorServiceMock.ensureHasPassword).toHaveBeenCalledWith(foundUser);
      expect(usersServiceMock.disconnectGoogleById).toHaveBeenCalledWith(foundUser.id);

      expect(result).toEqual({
        status: 'success',
        message: 'Google account disconnected successfully',
      });
    });
  });

  describe('createGoogleConnectToken', () => {
    it('should create google connect token', async () => {
      configServiceMock.getOrThrow.mockReturnValue('secret');
      jwtServiceMock.signAsync.mockResolvedValue('signed-token');

      const result = await service.createGoogleConnectToken('user-id');

      expect(configServiceMock.getOrThrow).toHaveBeenCalledWith('GOOGLE_CONNECT_TOKEN_SECRET');
      expect(jwtServiceMock.signAsync).toHaveBeenCalledWith(
        {
          sub: 'user-id',
          type: GOOGLE_CONNECT_TOKEN_TYPE,
        },
        {
          secret: 'secret',
          expiresIn: '10m',
        },
      );
      expect(result).toBe('signed-token');
    });
  });

  describe('verifyGoogleConnectToken', () => {
    it('should verify and return payload for valid token', async () => {
      const payload = {
        sub: 'user-id',
        type: GOOGLE_CONNECT_TOKEN_TYPE,
      };

      configServiceMock.getOrThrow.mockReturnValue('secret');
      jwtServiceMock.verifyAsync.mockResolvedValue(payload);

      const result = await service.verifyGoogleConnectToken('valid-token');

      expect(configServiceMock.getOrThrow).toHaveBeenCalledWith('GOOGLE_CONNECT_TOKEN_SECRET');
      expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'secret',
      });
      expect(result).toEqual(payload);
    });

    it('should throw ForbiddenException if token is invalid or expired', async () => {
      configServiceMock.getOrThrow.mockReturnValue('secret');
      jwtServiceMock.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(service.verifyGoogleConnectToken('bad-token')).rejects.toThrow(
        new ForbiddenException('Invalid or expired Google connect token'),
      );
    });

    it('should throw ForbiddenException if token type is invalid', async () => {
      configServiceMock.getOrThrow.mockReturnValue('secret');
      jwtServiceMock.verifyAsync.mockResolvedValue({
        sub: 'user-id',
        type: 'wrong-type',
      });

      await expect(service.verifyGoogleConnectToken('valid-token')).rejects.toThrow(
        new ForbiddenException('Invalid token type'),
      );
    });
  });
});
