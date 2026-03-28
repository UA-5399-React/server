import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { CryptoService } from '@/auth/crypto/crypto.service';
import { EmailVerificationService } from '@/auth/services/email-verification.service';
import { TokenType } from '@/auth/tokens/token.schema';
import { TokensService } from '@/auth/tokens/tokens.service';
import { MailService } from '@/mailer/mailer.service';
import { UserDocument } from '@/users/entities/user.schema';
import { Role } from '@/users/enums/role.enum';
import { UsersService } from '@/users/users.service';

const cryptoServiceMock = {
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
};
const mailServiceMock = {
  sendEmailVerification: jest.fn(),
};
const configServiceMock = {
  getOrThrow: jest.fn(),
};

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;

  const createMockUser = (
    overrides: Partial<{
      id: string;
      email: string;
      role: Role;
      isEmailConfirmed: boolean;
      save: jest.Mock;
    }> = {},
  ): UserDocument =>
    ({
      id: overrides.id ?? 'user-id',
      email: overrides.email ?? 'test@example.com',
      role: overrides.role ?? Role.CUSTOMER,
      isEmailConfirmed: overrides.isEmailConfirmed ?? false,
      save: overrides.save ?? jest.fn().mockResolvedValue(undefined),
    }) as unknown as UserDocument;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailVerificationService,
        { provide: UsersService, useValue: usersServiceMock },
        { provide: CryptoService, useValue: cryptoServiceMock },
        { provide: TokensService, useValue: tokensServiceMock },
        { provide: MailService, useValue: mailServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<EmailVerificationService>(EmailVerificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAndSendVerification', () => {
    it('should create and send verification', async () => {
      const user = createMockUser();

      cryptoServiceMock.generateRandomToken.mockReturnValueOnce('token');
      cryptoServiceMock.generateSha256HashBase64.mockReturnValueOnce('tokenHash');
      configServiceMock.getOrThrow.mockReturnValueOnce('http://localhost:3000');

      await service.createAndSendVerification(user);

      expect(tokensServiceMock.createToken).toHaveBeenCalledTimes(1);
      expect(configServiceMock.getOrThrow).toHaveBeenCalledWith('CLIENT_URL');

      expect(tokensServiceMock.createToken).toHaveBeenCalledWith({
        userId: user.id,
        type: TokenType.EMAIL_VERIFICATION,
        tokenHash: 'tokenHash',
        expiresAt: expect.any(Date) as Date,
      });

      expect(mailServiceMock.sendEmailVerification).toHaveBeenCalledWith(
        user.email,
        'http://localhost:3000/auth/confirm-email?token=token',
      );
    });
  });

  describe('confirmEmail', () => {
    it('should confirmed email and mark token as used', async () => {
      const user = createMockUser({ isEmailConfirmed: false });
      const saveSpy = jest.spyOn(user, 'save');

      cryptoServiceMock.generateSha256HashBase64.mockReturnValue('hashed-token');
      tokensServiceMock.findByTokenHash.mockResolvedValue({
        id: 'token-id',
        userId: { toString: () => 'user-id' },
        expiresAt: new Date(Date.now() + 60_000),
      });
      usersServiceMock.findById.mockResolvedValue(user);

      const result = await service.confirmEmail('raw-token');

      expect(usersServiceMock.findById).toHaveBeenCalledWith('user-id');
      expect(user.isEmailConfirmed).toBe(true);
      expect(saveSpy).toHaveBeenCalled();
      expect(tokensServiceMock.markAsUsed).toHaveBeenCalledWith('token-id');

      expect(result).toEqual({
        message: 'Email confirmed successfully',
      });
    });

    it('should throw BadRequestException when token is null', async () => {
      await expect(service.confirmEmail('')).rejects.toThrow(
        new BadRequestException('Token is required'),
      );
    });

    it('should throw if token document is not found', async () => {
      cryptoServiceMock.generateSha256HashBase64.mockReturnValueOnce('hashed-token');
      tokensServiceMock.findByTokenHash.mockResolvedValue(null);

      await expect(service.confirmEmail('raw-token')).rejects.toThrow(
        new BadRequestException('Invalid or expired token'),
      );

      expect(cryptoServiceMock.generateSha256HashBase64).toHaveBeenCalledWith('raw-token');
      expect(tokensServiceMock.findByTokenHash).toHaveBeenCalledWith(
        'hashed-token',
        TokenType.EMAIL_VERIFICATION,
      );
    });

    it('should throw if token expired', async () => {
      cryptoServiceMock.generateSha256HashBase64.mockReturnValue('hashed-token');
      tokensServiceMock.findByTokenHash.mockResolvedValue({
        id: 'token-id',
        userId: { toString: () => 'user-id' },
        expiresAt: new Date(Date.now() - 60_000),
      });

      await expect(service.confirmEmail('raw-token')).rejects.toThrow(
        new BadRequestException('Token expired'),
      );
    });
  });

  describe('resendConfirmation', () => {
    it('should return generic message if user does not exist', async () => {
      usersServiceMock.findByEmail.mockResolvedValue(null);

      const result = await service.resendConfirmation('missing@example.com');

      expect(result).toEqual({
        message: 'If this email exists, a confirmation link was sent.',
      });

      expect(tokensServiceMock.deleteByUserAndType).not.toHaveBeenCalled();
      expect(tokensServiceMock.createToken).not.toHaveBeenCalled();
      expect(mailServiceMock.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should return message if email is already confirmed', async () => {
      const user = createMockUser({ isEmailConfirmed: true });
      usersServiceMock.findByEmail.mockResolvedValue(user);

      const result = await service.resendConfirmation(user.email);

      expect(result).toEqual({
        message: 'Email is already confirmed.',
      });

      expect(tokensServiceMock.deleteByUserAndType).not.toHaveBeenCalled();
      expect(tokensServiceMock.createToken).not.toHaveBeenCalled();
      expect(mailServiceMock.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should delete old token, create new token and send email', async () => {
      const user = createMockUser({ isEmailConfirmed: false });

      usersServiceMock.findByEmail.mockResolvedValue(user);
      cryptoServiceMock.generateRandomToken.mockReturnValue('new-raw-token');
      cryptoServiceMock.generateSha256HashBase64.mockReturnValue('new-hashed-token');
      configServiceMock.getOrThrow.mockReturnValueOnce('http://localhost:3000');

      const result = await service.resendConfirmation(user.email);

      expect(tokensServiceMock.deleteByUserAndType).toHaveBeenCalledWith(
        user.id,
        TokenType.EMAIL_VERIFICATION,
      );

      expect(tokensServiceMock.createToken).toHaveBeenCalledTimes(1);

      expect(configServiceMock.getOrThrow).toHaveBeenCalledWith('CLIENT_URL');

      expect(tokensServiceMock.createToken).toHaveBeenCalledWith({
        userId: user.id,
        type: TokenType.EMAIL_VERIFICATION,
        tokenHash: 'new-hashed-token',
        expiresAt: expect.any(Date) as Date,
      });

      expect(mailServiceMock.sendEmailVerification).toHaveBeenCalledWith(
        user.email,
        'http://localhost:3000/auth/confirm-email?token=new-raw-token',
      );

      expect(result).toEqual({
        message: 'Confirmation email sent.',
      });
    });
  });
});
