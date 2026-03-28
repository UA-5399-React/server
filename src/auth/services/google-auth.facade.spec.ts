import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

import { ROUTES } from '@/auth/constants';
import { GoogleConnectStatus } from '@/auth/enums/google-connect-status.enum';
import { AuthCookiesService } from '@/auth/services/auth-cookies.service';
import { GoogleAccountService } from '@/auth/services/google-account.service';
import type { AuthUser } from '@/auth/types/auth-user.type';
import type { GoogleAuthUser } from '@/auth/types/google-auth-user.type';
import type { GoogleCallbackInput } from '@/auth/types/google-callback-input.type';
import { AppLogger } from '@/logger/app-logger.service';
import { Role } from '@/users/enums/role.enum';

import { GoogleAuthFacade } from './google-auth.facade';

const configServiceMock = {
  getOrThrow: jest.fn(),
};

const googleAccountServiceMock = {
  createGoogleConnectToken: jest.fn(),
  verifyGoogleConnectToken: jest.fn(),
  connectGoogleAccount: jest.fn(),
  handleGoogleLogin: jest.fn(),
  disconnectGoogleAccount: jest.fn(),
};

const cookiesServiceMock = {
  setGoogleConnectCookie: jest.fn(),
  clearGoogleConnectCookie: jest.fn(),
  setAuthCookies: jest.fn(),
  clearRedirectAfterLoginCookie: jest.fn(),
};

const loggerMock = {
  warn: jest.fn(),
};

const createResponseMock = (): Pick<Response, 'redirect'> => ({
  redirect: jest.fn(),
});

const authUser: AuthUser = {
  id: 'user-id',
  email: 'test@example.com',
  role: Role.CUSTOMER,
};

const googleUser: GoogleAuthUser = {
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  googleId: 'google-123',
  avatarUrl: 'https://example.com/avatar.png',
  provider: 'google',
};

describe('GoogleAuthFacade', () => {
  let service: GoogleAuthFacade;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new GoogleAuthFacade(
      configServiceMock as unknown as ConfigService,
      googleAccountServiceMock as unknown as GoogleAccountService,
      cookiesServiceMock as unknown as AuthCookiesService,
      loggerMock as unknown as AppLogger,
    );
  });

  describe('startConnectFlow', () => {
    it('should create token, set cookie and redirect to google route', async () => {
      const res = createResponseMock();
      googleAccountServiceMock.createGoogleConnectToken.mockResolvedValue('connect-token');

      await service.startConnectFlow(authUser, res as Response);

      expect(googleAccountServiceMock.createGoogleConnectToken).toHaveBeenCalledWith(authUser.id);
      expect(cookiesServiceMock.setGoogleConnectCookie).toHaveBeenCalledWith(res, 'connect-token');
      expect(res.redirect).toHaveBeenCalledWith(ROUTES.AUTH.GOOGLE);
    });
  });

  describe('handleCallback', () => {
    it('should use google connect flow when googleConnectToken exists', async () => {
      const res = createResponseMock();
      configServiceMock.getOrThrow.mockReturnValue('http://localhost:5173');
      googleAccountServiceMock.verifyGoogleConnectToken.mockResolvedValue({ sub: 'user-id' });
      googleAccountServiceMock.connectGoogleAccount.mockResolvedValue(undefined);

      const input: GoogleCallbackInput = {
        googleConnectToken: 'connect-token',
        googleUser,
        redirectAfterLogin: '/shop',
      };

      await service.handleCallback(input, res as Response);

      expect(googleAccountServiceMock.verifyGoogleConnectToken).toHaveBeenCalledWith(
        'connect-token',
      );
      expect(googleAccountServiceMock.connectGoogleAccount).toHaveBeenCalledWith(
        'user-id',
        googleUser,
      );
      expect(cookiesServiceMock.clearGoogleConnectCookie).toHaveBeenCalledWith(res);
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:5173' + `${ROUTES.USERS.PROFILE}?google=${GoogleConnectStatus.CONNECTED}`,
      );
    });

    it('should use google auth flow when googleConnectToken does not exist', async () => {
      const res = createResponseMock();
      configServiceMock.getOrThrow.mockReturnValue('http://localhost:5173');
      googleAccountServiceMock.handleGoogleLogin.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const input: GoogleCallbackInput = {
        googleConnectToken: undefined,
        googleUser,
        redirectAfterLogin: '/cart',
      };

      await service.handleCallback(input, res as Response);

      expect(googleAccountServiceMock.handleGoogleLogin).toHaveBeenCalledWith(googleUser);
      expect(cookiesServiceMock.setAuthCookies).toHaveBeenCalledWith(
        res,
        'access-token',
        'refresh-token',
      );
      expect(cookiesServiceMock.clearRedirectAfterLoginCookie).toHaveBeenCalledWith(res);
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:5173/cart');
    });
  });

  describe('disconnect', () => {
    it('should disconnect google account and return success', async () => {
      googleAccountServiceMock.disconnectGoogleAccount.mockResolvedValue(undefined);

      const result = await service.disconnect(authUser);

      expect(googleAccountServiceMock.disconnectGoogleAccount).toHaveBeenCalledWith(authUser);
      expect(result).toEqual({ success: true });
    });
  });

  describe('handleGoogleConnect flow', () => {
    it('should redirect with CONNECTED status on success', async () => {
      const res = createResponseMock();
      configServiceMock.getOrThrow.mockReturnValue('http://localhost:5173');
      googleAccountServiceMock.verifyGoogleConnectToken.mockResolvedValue({ sub: 'user-id' });
      googleAccountServiceMock.connectGoogleAccount.mockResolvedValue(undefined);

      const input: GoogleCallbackInput = {
        googleConnectToken: 'connect-token',
        googleUser,
        redirectAfterLogin: '/profile',
      };

      await service.handleCallback(input, res as Response);

      expect(cookiesServiceMock.clearGoogleConnectCookie).toHaveBeenCalledWith(res);
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:5173' + `${ROUTES.USERS.PROFILE}?google=${GoogleConnectStatus.CONNECTED}`,
      );
    });

    it('should redirect with EMAIL_MISMATCH status on BadRequestException', async () => {
      const res = createResponseMock();
      configServiceMock.getOrThrow.mockReturnValue('http://localhost:5173');
      googleAccountServiceMock.verifyGoogleConnectToken.mockRejectedValue(
        new BadRequestException('Email mismatch'),
      );

      const input: GoogleCallbackInput = {
        googleConnectToken: 'connect-token',
        googleUser,
        redirectAfterLogin: '/profile',
      };

      await service.handleCallback(input, res as Response);

      expect(loggerMock.warn).toHaveBeenCalled();
      expect(cookiesServiceMock.clearGoogleConnectCookie).toHaveBeenCalledWith(res);
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:5173' +
          `${ROUTES.USERS.PROFILE}?google=${GoogleConnectStatus.EMAIL_MISMATCH}`,
      );
    });

    it('should redirect with ALREADY_LINKED status on ConflictException', async () => {
      const res = createResponseMock();
      configServiceMock.getOrThrow.mockReturnValue('http://localhost:5173');
      googleAccountServiceMock.verifyGoogleConnectToken.mockRejectedValue(
        new ConflictException('Already linked'),
      );

      const input: GoogleCallbackInput = {
        googleConnectToken: 'connect-token',
        googleUser,
        redirectAfterLogin: '/profile',
      };

      await service.handleCallback(input, res as Response);

      expect(cookiesServiceMock.clearGoogleConnectCookie).toHaveBeenCalledWith(res);
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:5173' +
          `${ROUTES.USERS.PROFILE}?google=${GoogleConnectStatus.ALREADY_LINKED}`,
      );
    });

    it('should redirect with UNAUTHORIZED status on UnauthorizedException', async () => {
      const res = createResponseMock();
      configServiceMock.getOrThrow.mockReturnValue('http://localhost:5173');
      googleAccountServiceMock.verifyGoogleConnectToken.mockRejectedValue(
        new UnauthorizedException('Unauthorized'),
      );

      const input: GoogleCallbackInput = {
        googleConnectToken: 'connect-token',
        googleUser,
        redirectAfterLogin: '/profile',
      };

      await service.handleCallback(input, res as Response);

      expect(cookiesServiceMock.clearGoogleConnectCookie).toHaveBeenCalledWith(res);
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:5173' +
          `${ROUTES.USERS.PROFILE}?google=${GoogleConnectStatus.UNAUTHORIZED}`,
      );
    });

    it('should redirect with ERROR status on unknown error', async () => {
      const res = createResponseMock();
      configServiceMock.getOrThrow.mockReturnValue('http://localhost:5173');
      googleAccountServiceMock.verifyGoogleConnectToken.mockRejectedValue(new Error('Unknown'));

      const input: GoogleCallbackInput = {
        googleConnectToken: 'connect-token',
        googleUser,
        redirectAfterLogin: '/profile',
      };

      await service.handleCallback(input, res as Response);

      expect(cookiesServiceMock.clearGoogleConnectCookie).toHaveBeenCalledWith(res);
      expect(res.redirect).toHaveBeenCalledWith(
        'http://localhost:5173' + `${ROUTES.USERS.PROFILE}?google=${GoogleConnectStatus.ERROR}`,
      );
    });

    it('should log warning when google connect fails', async () => {
      const res = createResponseMock();
      const error = new Error('Connect failed');

      configServiceMock.getOrThrow.mockReturnValue('http://localhost:5173');
      googleAccountServiceMock.verifyGoogleConnectToken.mockRejectedValue(error);

      const input: GoogleCallbackInput = {
        googleConnectToken: 'connect-token',
        googleUser,
        redirectAfterLogin: '/profile',
      };

      await service.handleCallback(input, res as Response);

      expect(loggerMock.warn).toHaveBeenCalledWith('Google connect failed', {
        error: 'Connect failed',
        stack: error.stack,
        googleId: googleUser.googleId,
      });
    });
  });

  describe('handleGoogleAuth flow', () => {
    it('should redirect to valid redirectAfterLogin path', async () => {
      const res = createResponseMock();

      configServiceMock.getOrThrow.mockReturnValue('http://localhost:5173');
      googleAccountServiceMock.handleGoogleLogin.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const input: GoogleCallbackInput = {
        googleConnectToken: undefined,
        googleUser,
        redirectAfterLogin: '/checkout',
      };

      await service.handleCallback(input, res as Response);

      expect(cookiesServiceMock.setAuthCookies).toHaveBeenCalledWith(
        res,
        'access-token',
        'refresh-token',
      );
      expect(cookiesServiceMock.clearRedirectAfterLoginCookie).toHaveBeenCalledWith(res);
      expect(configServiceMock.getOrThrow).toHaveBeenCalledWith('CLIENT_URL');
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:5173/checkout');
    });

    it('should fallback to root when redirectAfterLogin is invalid', async () => {
      const res = createResponseMock();

      configServiceMock.getOrThrow.mockReturnValue('http://localhost:5173');
      googleAccountServiceMock.handleGoogleLogin.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const input: GoogleCallbackInput = {
        googleConnectToken: undefined,
        googleUser,
        redirectAfterLogin: 'https://evil.com',
      };

      await service.handleCallback(input, res as Response);

      expect(res.redirect).toHaveBeenCalledWith('http://localhost:5173/');
    });

    it('should fallback to root when redirectAfterLogin is undefined', async () => {
      const res = createResponseMock();

      configServiceMock.getOrThrow.mockReturnValue('http://localhost:5173');
      googleAccountServiceMock.handleGoogleLogin.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const input: GoogleCallbackInput = {
        googleConnectToken: undefined,
        googleUser,
        redirectAfterLogin: undefined,
      };

      await service.handleCallback(input, res as Response);

      expect(res.redirect).toHaveBeenCalledWith('http://localhost:5173/');
    });
  });
});
