import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';

import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { AuthCookiesService } from '@/auth/services/auth-cookies.service';
import { EmailVerificationService } from '@/auth/services/email-verification.service';
import { GoogleAuthFacade } from '@/auth/services/google-auth.facade';
import { AuthRequest } from '@/auth/types/auth-request.type';
import { Role } from '@/users/enums/role.enum';

const authServiceMock = {
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  generateTokens: jest.fn(),
};

const cookiesServiceMock = {
  setAuthCookies: jest.fn(),
  clearAuthCookies: jest.fn(),
};

const emailVerificationServiceMock = {
  confirmEmail: jest.fn(),
  resendConfirmation: jest.fn(),
};

const googleAuthFacadeMock = {
  handleCallback: jest.fn(),
  startConnectFlow: jest.fn(),
  disconnect: jest.fn(),
};

const mockAuthUser = {
  id: 'user-id',
  email: 'test@example.com',
  role: Role.CUSTOMER,
};

const mockResponse = {
  cookie: jest.fn(),
  clearCookie: jest.fn(),
  redirect: jest.fn(),
} as unknown as Response;

const mockRequest = {
  user: mockAuthUser,
  cookies: {},
} as AuthRequest;

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: AuthCookiesService, useValue: cookiesServiceMock },
        { provide: EmailVerificationService, useValue: emailVerificationServiceMock },
        { provide: GoogleAuthFacade, useValue: googleAuthFacadeMock },
      ],
    }).compile();

    controller = module.get(AuthController);
  });
  afterEach(() => jest.clearAllMocks());

  describe('login', () => {
    it('should login user, set cookies and return success', async () => {
      authServiceMock.login.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await controller.login({} as never, mockRequest, mockResponse);

      expect(authServiceMock.login).toHaveBeenCalledWith(mockAuthUser);
      expect(cookiesServiceMock.setAuthCookies).toHaveBeenCalledWith(
        mockResponse,
        'access-token',
        'refresh-token',
      );

      expect(result).toEqual({ status: 'success' });
    });
  });

  describe('logout', () => {
    it('should clear cookies and return success', () => {
      const result = controller.logout(mockResponse);

      expect(cookiesServiceMock.clearAuthCookies).toHaveBeenCalledWith(mockResponse);
      expect(result).toEqual({ status: 'success' });
    });
  });

  describe('me', () => {
    it('should return current user', () => {
      const result = controller.me(mockRequest);

      expect(result).toEqual(mockAuthUser);
    });
  });

  describe('refresh', () => {
    it('should generate tokens, set cookies and return success', async () => {
      authServiceMock.generateTokens.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await controller.refresh(mockResponse, mockRequest);

      expect(authServiceMock.generateTokens).toHaveBeenCalledWith(mockAuthUser);
      expect(cookiesServiceMock.setAuthCookies).toHaveBeenCalledWith(
        mockResponse,
        'new-access-token',
        'new-refresh-token',
      );
      expect(result).toEqual({ status: 'success' });
    });
  });

  describe('register', () => {
    it('should delegate registration to authService', async () => {
      const dto = {
        email: 'new@example.com',
        password: 'Password123!',
        passwordConfirmation: 'Password123!',
      };

      authServiceMock.register.mockResolvedValue({
        status: 'success',
        message: 'User created successfully.',
      });

      const result = await controller.register(dto);

      expect(authServiceMock.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        status: 'success',
        message: 'User created successfully.',
      });
    });
  });

  describe('resendConfirmation', () => {
    it('should call emailVerificationService.resendConfirmation', async () => {
      emailVerificationServiceMock.resendConfirmation.mockResolvedValue({
        message: 'Confirmation email sent.',
      });

      const result = await controller.resendConfirmation('test@example.com');

      expect(emailVerificationServiceMock.resendConfirmation).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(result).toEqual({ message: 'Confirmation email sent.' });
    });
  });

  describe('confirmEmail', () => {
    it('should call emailVerificationService.confirmEmail and return result', async () => {
      emailVerificationServiceMock.confirmEmail.mockResolvedValue({
        message: 'Email confirmed successfully',
      });

      const result = await controller.confirmEmail('valid-token');

      expect(emailVerificationServiceMock.confirmEmail).toHaveBeenCalledWith('valid-token');
      expect(result).toEqual({ message: 'Email confirmed successfully' });
    });
  });

  describe('googleCallback', () => {
    it('should pass google callback input to facade', async () => {
      const req = {
        user: mockAuthUser,
        cookies: {
          google_connect_token: 'connect-token',
          redirect_after_login: '/checkout',
        },
      } as Partial<AuthRequest> as AuthRequest;

      googleAuthFacadeMock.handleCallback.mockResolvedValue({
        status: 'success',
      });

      const result = await controller.googleCallback(req, mockResponse);

      expect(googleAuthFacadeMock.handleCallback).toHaveBeenCalledWith(
        {
          googleUser: mockAuthUser,
          googleConnectToken: 'connect-token',
          redirectAfterLogin: '/checkout',
        },
        mockResponse,
      );

      expect(result).toEqual({ status: 'success' });
    });

    it('should pass undefined values when cookies are missing', async () => {
      googleAuthFacadeMock.handleCallback.mockResolvedValue({
        status: 'success',
      });

      await controller.googleCallback(mockRequest, mockResponse);

      expect(googleAuthFacadeMock.handleCallback).toHaveBeenCalledWith(
        {
          googleUser: mockRequest.user,
          googleConnectToken: undefined,
          redirectAfterLogin: undefined,
        },
        mockResponse,
      );
    });
  });

  describe('googleConnect', () => {
    it('should call googleAuthFacade.startConnectFlow', async () => {
      googleAuthFacadeMock.startConnectFlow.mockResolvedValue(undefined);

      await controller.googleConnect(mockRequest, mockResponse);

      expect(googleAuthFacadeMock.startConnectFlow).toHaveBeenCalledWith(
        mockAuthUser,
        mockResponse,
      );
    });
  });

  describe('googleDisconnect', () => {
    it('should call googleAuthFacade.disconnect', async () => {
      googleAuthFacadeMock.disconnect.mockResolvedValue({
        success: true,
      });

      const result = await controller.googleDisconnect(mockRequest);

      expect(googleAuthFacadeMock.disconnect).toHaveBeenCalledWith(mockAuthUser);
      expect(result).toEqual({ success: true });
    });
  });
});
