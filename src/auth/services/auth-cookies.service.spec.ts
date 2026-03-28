import type { Response } from 'express';

import { AuthCookiesService } from '@/auth/services/auth-cookies.service';

describe('AuthCookiesService', () => {
  let service: AuthCookiesService;

  const resMock: Pick<Response, 'cookie' | 'clearCookie'> = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuthCookiesService();
  });

  describe('setAuthCookies', () => {
    it('should set access and refresh cookies', () => {
      service.setAuthCookies(resMock as Response, 'access-token', 'refresh-token');

      expect(resMock.cookie).toHaveBeenCalledWith(
        'accessToken',
        'access-token',
        expect.any(Object),
      );

      expect(resMock.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh-token',
        expect.any(Object),
      );
    });
  });

  describe('clearAuthCookies', () => {
    it('should clear access and refresh cookies', () => {
      service.clearAuthCookies(resMock as Response);

      expect(resMock.clearCookie).toHaveBeenCalledWith('accessToken', expect.any(Object));

      expect(resMock.clearCookie).toHaveBeenCalledWith('refreshToken', expect.any(Object));
    });
  });

  describe('setGoogleConnectCookie', () => {
    it('should set google connect cookie', () => {
      service.setGoogleConnectCookie(resMock as Response, 'token');

      expect(resMock.cookie).toHaveBeenCalledWith(
        'google_connect_token',
        'token',
        expect.any(Object),
      );
    });
  });

  describe('clearGoogleConnectCookie', () => {
    it('should clear google connect cookie', () => {
      service.clearGoogleConnectCookie(resMock as Response);

      expect(resMock.clearCookie).toHaveBeenCalledWith('google_connect_token', expect.any(Object));
    });
  });

  describe('clearRedirectAfterLoginCookie', () => {
    it('should clear redirect cookie', () => {
      service.clearRedirectAfterLoginCookie(resMock as Response);

      expect(resMock.clearCookie).toHaveBeenCalledWith('redirect_after_login', expect.any(Object));
    });
  });
});
