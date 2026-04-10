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
  findActiveByUserAndType: jest.fn(),
  deleteById: jest.fn(),
  createTokenData: jest.fn(),
  findValidTokenOrThrow: jest.fn(),
  ensureCooldownOrThrow: jest.fn(),
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

      tokensServiceMock.createTokenData.mockReturnValue({
        rawToken: 'token',
        tokenHash: 'tokenHash',
        expiresAt: new Date(),
      });
      tokensServiceMock.createToken.mockResolvedValue({
        _id: 'tokenId',
      });
      configServiceMock.getOrThrow.mockReturnValueOnce('http://localhost:3000');

      await service.createAndSendVerification(user);

      expect(tokensServiceMock.createToken).toHaveBeenCalledWith({
        userId: user.id,
        type: TokenType.EMAIL_VERIFICATION,
        tokenHash: 'tokenHash',
        expiresAt: expect.any(Date) as Date,
      });

      expect(mailServiceMock.sendEmailVerification).toHaveBeenCalledWith(
        user.email,
        'http://localhost:3000/email-confirmation?token=token',
      );
    });
  });

  describe('confirmEmail', () => {
    it('should confirmed email and mark token as used', async () => {
      const user = createMockUser({ isEmailConfirmed: false });
      const saveSpy = jest.spyOn(user, 'save');

      tokensServiceMock.findValidTokenOrThrow.mockResolvedValue({
        id: 'token-id',
        userId: { toString: () => 'user-id' },
      });

      usersServiceMock.findById.mockResolvedValue(user);

      const result = await service.confirmEmail('raw-token');
      expect(tokensServiceMock.findValidTokenOrThrow).toHaveBeenCalledWith(
        'raw-token',
        TokenType.EMAIL_VERIFICATION,
      );
      expect(usersServiceMock.findById).toHaveBeenCalledWith('user-id');
      expect(user.isEmailConfirmed).toBe(true);
      expect(saveSpy).toHaveBeenCalled();
      expect(tokensServiceMock.markAsUsed).toHaveBeenCalledWith('token-id');

      expect(result).toEqual({
        message: 'Email confirmed successfully',
      });
    });

    it('should throw if token is invalid or expired', async () => {
      tokensServiceMock.findValidTokenOrThrow.mockRejectedValue(
        new BadRequestException('Invalid or expired token'),
      );

      await expect(service.confirmEmail('raw-token')).rejects.toThrow(
        new BadRequestException('Invalid or expired token'),
      );

      expect(tokensServiceMock.findValidTokenOrThrow).toHaveBeenCalledWith(
        'raw-token',
        TokenType.EMAIL_VERIFICATION,
      );
    });
  });

  describe('resendConfirmation', () => {
    const neutralMessage = {
      message:
        'If the account exists and is not yet confirmed, a confirmation email has been sent.',
    };
    it('should return generic message if user does not exist', async () => {
      usersServiceMock.findByEmail.mockResolvedValue(null);

      const result = await service.resendConfirmation('missing@example.com');

      expect(result).toEqual(neutralMessage);
      expect(tokensServiceMock.ensureCooldownOrThrow).not.toHaveBeenCalled();
      expect(tokensServiceMock.deleteByUserAndType).not.toHaveBeenCalled();
      expect(tokensServiceMock.createToken).not.toHaveBeenCalled();
      expect(mailServiceMock.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should return generic message if email is already confirmed', async () => {
      const user = createMockUser({ isEmailConfirmed: true });
      usersServiceMock.findByEmail.mockResolvedValue(user);

      const result = await service.resendConfirmation(user.email);

      expect(result).toEqual(neutralMessage);
      expect(tokensServiceMock.ensureCooldownOrThrow).not.toHaveBeenCalled();
      expect(tokensServiceMock.deleteByUserAndType).not.toHaveBeenCalled();
      expect(tokensServiceMock.createToken).not.toHaveBeenCalled();
      expect(mailServiceMock.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should delete old token, create new token and send email', async () => {
      const user = createMockUser({ isEmailConfirmed: false });

      usersServiceMock.findByEmail.mockResolvedValue(user);
      tokensServiceMock.ensureCooldownOrThrow.mockResolvedValue(undefined);
      tokensServiceMock.deleteByUserAndType.mockResolvedValue(undefined);
      tokensServiceMock.createTokenData.mockReturnValue({
        rawToken: 'new-raw-token',
        tokenHash: 'new-hashed-token',
        expiresAt: new Date(),
      });
      tokensServiceMock.createToken.mockResolvedValue({
        _id: { toString: () => 'token-id' },
      });
      configServiceMock.getOrThrow.mockReturnValueOnce('http://localhost:3000');

      const result = await service.resendConfirmation(user.email);

      expect(tokensServiceMock.ensureCooldownOrThrow).toHaveBeenCalledWith(
        user.id,
        TokenType.EMAIL_VERIFICATION,
        60 * 1000,
      );

      expect(tokensServiceMock.deleteByUserAndType).toHaveBeenCalledWith(
        user.id,
        TokenType.EMAIL_VERIFICATION,
      );

      expect(tokensServiceMock.createToken).toHaveBeenCalledWith({
        userId: user.id,
        type: TokenType.EMAIL_VERIFICATION,
        tokenHash: 'new-hashed-token',
        expiresAt: expect.any(Date) as Date,
      });

      expect(configServiceMock.getOrThrow).toHaveBeenCalledWith('CLIENT_URL');

      expect(mailServiceMock.sendEmailVerification).toHaveBeenCalledWith(
        user.email,
        'http://localhost:3000/email-confirmation?token=new-raw-token',
      );

      expect(result).toEqual({ message: 'Confirmation email sent.' });
    });
  });
});
