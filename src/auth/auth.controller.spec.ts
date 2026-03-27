import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';


const mockAuthCookiesService = {
  setAuthCookies: jest.fn(),
  clearAuthCookies: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    confirmEmail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'CLIENT_URL') {
        return 'http://localhost:5173';
      }

      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        { provide: AuthCookiesService, useValue: mockAuthCookiesService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('confirmEmail', () => {
    it('should redirect to frontend success page when confirmation succeeds', async () => {
      const res: RedirectResponse = {
        redirect: jest.fn(),
      };

      mockAuthService.confirmEmail.mockResolvedValue(undefined);

      await controller.confirmEmail('valid-token', res);

      expect(mockAuthService.confirmEmail).toHaveBeenCalledWith('valid-token');
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:5173/email-confirmation?status=success&message=Email+confirmed+successfully',
      );
    });

    it('should redirect to frontend error page when confirmation fails', async () => {
      const res: RedirectResponse = {
        redirect: jest.fn(),
      };

      mockAuthService.confirmEmail.mockRejectedValue(new BadRequestException('Token expired'));

      await controller.confirmEmail('expired-token', res);

      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:5173/email-confirmation?status=error&message=Token+expired',
      );
    });
  });
});
