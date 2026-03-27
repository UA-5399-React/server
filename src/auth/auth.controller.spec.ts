import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthCookiesService } from './services/auth-cookies.service';
import { EmailVerificationService } from './services/email-verification.service';
import { GoogleAuthFacade } from './services/google-auth.facade';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    generateTokens: jest.fn(),
  };

  const mockAuthCookiesService = {
    setAuthCookies: jest.fn(),
    clearAuthCookies: jest.fn(),
  };

  const mockEmailVerificationService = {
    confirmEmail: jest.fn(),
    resendConfirmation: jest.fn(),
  };

  const mockGoogleAuthFacade = {
    handleCallback: jest.fn(),
    startConnectFlow: jest.fn(),
    disconnect: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'CLIENT_URL') {
        return 'http://localhost:5173';
      }

      return undefined;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (key === 'CLIENT_URL') {
        return 'http://localhost:5173';
      }

      throw new Error(`Missing config key: ${key}`);
    }),
  };
  const redirectMock = jest.fn();
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: AuthCookiesService,
          useValue: mockAuthCookiesService,
        },
        {
          provide: EmailVerificationService,
          useValue: mockEmailVerificationService,
        },
        {
          provide: GoogleAuthFacade,
          useValue: mockGoogleAuthFacade,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('confirmEmail', () => {
    it('should redirect to frontend success page when confirmation succeeds', async () => {
      const res = {
        redirect: redirectMock,
      } as unknown as Response;

      mockEmailVerificationService.confirmEmail.mockResolvedValue(undefined);

      await controller.confirmEmail('valid-token', res);

      expect(mockEmailVerificationService.confirmEmail).toHaveBeenCalledWith('valid-token');
      expect(redirectMock).toHaveBeenCalledWith(
        'http://localhost:5173/email-confirmation?status=success&message=Email+confirmed+successfully',
      );
    });

    it('should redirect to frontend error page when confirmation fails', async () => {
      const res = {
        redirect: redirectMock,
      } as unknown as Response;

      mockEmailVerificationService.confirmEmail.mockRejectedValue(
        new BadRequestException('Token expired'),
      );

      await controller.confirmEmail('expired-token', res);

      expect(redirectMock).toHaveBeenCalledWith(
        'http://localhost:5173/email-confirmation?status=error&message=Token+expired',
      );
    });
  });
});
