import { Injectable } from '@nestjs/common';
import type { Response } from 'express';

import {
  ACCESS_TOKEN_COOKIE_OPTIONS,
  BASE_COOKIE_OPTIONS,
  GOOGLE_CONNECT_TOKEN_COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE_OPTIONS,
} from '@/auth/constants/auth.constants';

@Injectable()
export class AuthCookiesService {
  setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    res.cookie('accessToken', accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
    res.cookie('refreshToken', refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
  }

  clearAuthCookies(res: Response): void {
    res.clearCookie('accessToken', BASE_COOKIE_OPTIONS);
    res.clearCookie('refreshToken', BASE_COOKIE_OPTIONS);
  }

  setGoogleConnectCookie(res: Response, token: string): void {
    res.cookie('google_connect_token', token, GOOGLE_CONNECT_TOKEN_COOKIE_OPTIONS);
  }

  clearGoogleConnectCookie(res: Response): void {
    res.clearCookie('google_connect_token', GOOGLE_CONNECT_TOKEN_COOKIE_OPTIONS);
  }

  clearRedirectAfterLoginCookie(res: Response): void {
    res.clearCookie('redirect_after_login', BASE_COOKIE_OPTIONS);
  }
}
