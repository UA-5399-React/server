import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { CryptoService } from '@/auth/crypto/crypto.service';
import { PasswordResetService } from '@/auth/services/password-reset.service';
import { UserValidatorService } from '@/auth/services/user-validator.service';
import { TokenType } from '@/auth/tokens/token.schema';
import { TokensService } from '@/auth/tokens/tokens.service';
import { MailService } from '@/mailer/mailer.service';
import { UserDocument } from '@/users/entities/user.schema';
import { Role } from '@/users/enums/role.enum';
import { UsersService } from '@/users/users.service';

const cryptoServiceMock = {
  hashPassword: jest.fn(),
  generateRandomToken: jest.fn(),
  generateSha256HashBase64: jest.fn(),
};

const usersServiceMock = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
};

const tokensServiceMock = {
  findByTokenHash: jest.fn(),
  createToken: jest.fn(),
  markAsUsed: jest.fn(),
  deleteByUserAndType: jest.fn(),
  findActiveByUserAndType: jest.fn(),
  deleteById: jest.fn(),
  createTokenData: jest.fn(),
  findValidTokenOrThrow: jest.fn(),
  ensureCooldownOrThrow: jest.fn(),
};

const mailServiceMock = {
  sendResetPasswordToken: jest.fn(),
};

const configServiceMock = {
  getOrThrow: jest.fn(),
};

const userValidatorServiceMock = {
  ensureUserExists: jest.fn(),
  ensureEmailConfirmed: jest.fn(),
};

describe('PasswordResetService', () => {
  let service: PasswordResetService;

  const createMockUser = (
    overrides: Partial<{
      id: string;
      email: string;
      role: Role;
      isEmailConfirmed: boolean;
      passwordHash: string;
      save: jest.Mock;
    }> = {},
  ): UserDocument =>
    ({
      id: overrides.id ?? 'user-id',
      email: overrides.email ?? 'test@example.com',
      role: overrides.role ?? Role.CUSTOMER,
      isEmailConfirmed: overrides.isEmailConfirmed ?? true,
      passwordHash: overrides.passwordHash ?? 'old-hash',
      save: overrides.save ?? jest.fn().mockResolvedValue(undefined),
    }) as unknown as UserDocument;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: UsersService, useValue: usersServiceMock },
        { provide: UserValidatorService, useValue: userValidatorServiceMock },
        { provide: CryptoService, useValue: cryptoServiceMock },
        { provide: TokensService, useValue: tokensServiceMock },
        { provide: MailService, useValue: mailServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPasswordReset', () => {
    it('should return neutral message if user does not exist', async () => {
      usersServiceMock.findByEmail.mockResolvedValue(null);

      await expect(service.requestPasswordReset('test@example.com')).resolves.toEqual({
        message: 'If the account exists, a reset link has been sent.',
      });

      expect(userValidatorServiceMock.ensureEmailConfirmed).not.toHaveBeenCalled();
      expect(tokensServiceMock.ensureCooldownOrThrow).not.toHaveBeenCalled();
      expect(mailServiceMock.sendResetPasswordToken).not.toHaveBeenCalled();
    });

    it('should return neutral message if email is not confirmed', async () => {
      const user = createMockUser({ isEmailConfirmed: false });
      usersServiceMock.findByEmail.mockResolvedValue(user);

      await expect(service.requestPasswordReset('test@example.com')).resolves.toEqual({
        message: 'If the account exists, a reset link has been sent.',
      });

      expect(userValidatorServiceMock.ensureEmailConfirmed).not.toHaveBeenCalled();
      expect(tokensServiceMock.ensureCooldownOrThrow).not.toHaveBeenCalled();
      expect(mailServiceMock.sendResetPasswordToken).not.toHaveBeenCalled();
    });

    it('should request password reset for confirmed user', async () => {
      const user = createMockUser({ isEmailConfirmed: true });
      const expiresAt = new Date('2026-04-07T10:00:00.000Z');

      usersServiceMock.findByEmail.mockResolvedValue(user);
      userValidatorServiceMock.ensureEmailConfirmed.mockReturnValue(undefined);
      tokensServiceMock.ensureCooldownOrThrow.mockResolvedValue(undefined);
      tokensServiceMock.deleteByUserAndType.mockResolvedValue(undefined);
      tokensServiceMock.createTokenData.mockReturnValue({
        rawToken: 'token',
        tokenHash: 'tokenHash',
        expiresAt,
      });
      tokensServiceMock.createToken.mockResolvedValue({ _id: 'tokenId' });
      configServiceMock.getOrThrow.mockReturnValue('http://localhost:3000');
      mailServiceMock.sendResetPasswordToken.mockResolvedValue(undefined);

      await expect(service.requestPasswordReset('test@example.com')).resolves.toEqual({
        message: 'Please check your email, a reset link has been sent',
      });

      expect(usersServiceMock.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(userValidatorServiceMock.ensureEmailConfirmed).toHaveBeenCalledWith(user);
      expect(tokensServiceMock.ensureCooldownOrThrow).toHaveBeenCalledWith(
        user.id,
        TokenType.PASSWORD_RESET,
        60 * 1000,
      );
      expect(tokensServiceMock.deleteByUserAndType).toHaveBeenCalledWith(
        user.id,
        TokenType.PASSWORD_RESET,
      );
      expect(tokensServiceMock.createToken).toHaveBeenCalledWith({
        userId: user.id,
        type: TokenType.PASSWORD_RESET,
        tokenHash: 'tokenHash',
        expiresAt,
      });
      expect(mailServiceMock.sendResetPasswordToken).toHaveBeenCalledWith(
        user.email,
        'http://localhost:3000/reset-password?token=token',
      );
    });
  });

  describe('createAndSendResetToken', () => {
    it('should create and send reset token', async () => {
      const user = createMockUser();
      const expiresAt = new Date('2026-04-07T10:00:00.000Z');

      tokensServiceMock.deleteByUserAndType.mockResolvedValue(undefined);
      tokensServiceMock.createTokenData.mockReturnValue({
        rawToken: 'token',
        tokenHash: 'tokenHash',
        expiresAt,
      });
      tokensServiceMock.createToken.mockResolvedValue({
        _id: 'tokenId',
      });
      configServiceMock.getOrThrow.mockReturnValue('http://localhost:3000');
      mailServiceMock.sendResetPasswordToken.mockResolvedValue(undefined);

      await service.createAndSendResetToken(user);

      expect(tokensServiceMock.deleteByUserAndType).toHaveBeenCalledWith(
        user.id,
        TokenType.PASSWORD_RESET,
      );
      expect(tokensServiceMock.createTokenData).toHaveBeenCalledWith(24 * 60 * 60 * 1000);
      expect(tokensServiceMock.createToken).toHaveBeenCalledWith({
        userId: user.id,
        type: TokenType.PASSWORD_RESET,
        tokenHash: 'tokenHash',
        expiresAt,
      });
      expect(mailServiceMock.sendResetPasswordToken).toHaveBeenCalledWith(
        user.email,
        'http://localhost:3000/reset-password?token=token',
      );
    });

    it('should delete created token if email sending fails', async () => {
      const user = createMockUser();
      const error = new Error('Mail sending failed');

      tokensServiceMock.deleteByUserAndType.mockResolvedValue(undefined);
      tokensServiceMock.createTokenData.mockReturnValue({
        rawToken: 'token',
        tokenHash: 'tokenHash',
        expiresAt: new Date('2026-04-07T10:00:00.000Z'),
      });
      tokensServiceMock.createToken.mockResolvedValue({
        _id: 'tokenId',
      });
      configServiceMock.getOrThrow.mockReturnValue('http://localhost:3000');
      mailServiceMock.sendResetPasswordToken.mockRejectedValue(error);
      tokensServiceMock.deleteById.mockResolvedValue(undefined);

      await expect(service.createAndSendResetToken(user)).rejects.toThrow(error);

      expect(tokensServiceMock.deleteById).toHaveBeenCalledWith('tokenId');
    });
  });

  describe('resetPassword', () => {
    it('should reset password and delete all password reset tokens', async () => {
      const user = createMockUser();
      const tokenDoc = {
        userId: {
          toString: () => user.id,
        },
      };

      tokensServiceMock.findValidTokenOrThrow.mockResolvedValue(tokenDoc);
      usersServiceMock.findById.mockResolvedValue(user);
      userValidatorServiceMock.ensureUserExists.mockReturnValue(user);
      cryptoServiceMock.hashPassword.mockResolvedValue('new-hash');

      await expect(service.resetPassword('raw-token', 'newPassword123')).resolves.toEqual({
        message: 'Password changed successfully',
      });

      expect(tokensServiceMock.findValidTokenOrThrow).toHaveBeenCalledWith(
        'raw-token',
        TokenType.PASSWORD_RESET,
      );
      expect(usersServiceMock.findById).toHaveBeenCalledWith(user.id);
      expect(userValidatorServiceMock.ensureUserExists).toHaveBeenCalledWith(user);
      expect(cryptoServiceMock.hashPassword).toHaveBeenCalledWith('newPassword123');
      expect(user.passwordHash).toBe('new-hash');
      expect(tokensServiceMock.deleteByUserAndType).toHaveBeenCalledWith(
        user.id,
        TokenType.PASSWORD_RESET,
      );
    });
  });
});
