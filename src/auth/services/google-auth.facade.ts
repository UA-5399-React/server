import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

import { ROUTES } from '@/auth/constants';
import { GoogleConnectStatus } from '@/auth/enums/google-connect-status.enum';
import { AuthCookiesService } from '@/auth/services/auth-cookies.service';
import { GoogleAccountService } from '@/auth/services/google-account-service';
import type { AuthUser } from '@/auth/types/auth-user.type';
import type { GoogleAuthUser } from '@/auth/types/google-auth-user.type';
import { GoogleCallbackInput } from '@/auth/types/google-callback-input.type';
import { AppLogger } from '@/logger/app-logger.service';

@Injectable()
export class GoogleAuthFacade {
  constructor(
    private readonly configService: ConfigService,
    private readonly googleAccountService: GoogleAccountService,
    private readonly cookiesService: AuthCookiesService,
    private readonly logger: AppLogger,
  ) {}
  async startConnectFlow(user: AuthUser, res: Response) {
    const token = await this.googleAccountService.createGoogleConnectToken(user.id);

    this.cookiesService.setGoogleConnectCookie(res, token);

    return res.redirect(ROUTES.AUTH.GOOGLE);
  }

  async handleCallback(input: GoogleCallbackInput, res: Response) {
    const token = input.googleConnectToken;

    if (token) {
      return this.handleGoogleConnect(token, input.googleUser, res);
    }
    return this.handleGoogleAuth(input, res);
  }

  async disconnect(user: AuthUser): Promise<{ success: true }> {
    await this.googleAccountService.disconnectGoogleAccount(user);
    return { success: true };
  }

  private async handleGoogleConnect(token: string, googleUser: GoogleAuthUser, res: Response) {
    try {
      const payload = await this.googleAccountService.verifyGoogleConnectToken(token);
      await this.googleAccountService.connectGoogleAccount(payload.sub, googleUser);
      this.cookiesService.clearGoogleConnectCookie(res);

      return res.redirect(this.buildGoogleConnectRedirect(GoogleConnectStatus.CONNECTED));
    } catch (error) {
      this.logger.warn('Google connect failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        googleId: googleUser.googleId,
      });
      this.cookiesService.clearGoogleConnectCookie(res);

      return res.redirect(
        this.buildGoogleConnectRedirect(this.mapGoogleConnectErrorToStatus(error)),
      );
    }
  }

  private async handleGoogleAuth(input: GoogleCallbackInput, res: Response) {
    const { accessToken, refreshToken } = await this.googleAccountService.handleGoogleLogin(
      input.googleUser,
    );
    this.cookiesService.setAuthCookies(res, accessToken, refreshToken);

    const redirectPath =
      typeof input.redirectAfterLogin === 'string' && input.redirectAfterLogin.startsWith('/')
        ? input.redirectAfterLogin
        : '/';
    const clientUrl = this.configService.getOrThrow<string>('CLIENT_URL');

    this.cookiesService.clearRedirectAfterLoginCookie(res);
    return res.redirect(`${clientUrl}${redirectPath}`);
  }

  private mapGoogleConnectErrorToStatus(error: unknown): GoogleConnectStatus {
    if (error instanceof BadRequestException) {
      return GoogleConnectStatus.EMAIL_MISMATCH;
    }

    if (error instanceof ConflictException) {
      return GoogleConnectStatus.ALREADY_LINKED;
    }

    if (error instanceof UnauthorizedException) {
      return GoogleConnectStatus.UNAUTHORIZED;
    }

    return GoogleConnectStatus.ERROR;
  }

  private buildGoogleConnectRedirect(status: GoogleConnectStatus): string {
    const baseUrl = `${this.configService.getOrThrow<string>('CLIENT_URL')}${ROUTES.USERS.PROFILE}`;
    const url = new URL(baseUrl);
    url.searchParams.set('google', status);
    return url.toString();
  }
}
