import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiCreatedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { GoogleOauthGuard } from '@/auth/guards/google-oauth.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from '@/auth/guards/jwt-refresh.guard';
import { LocalAuthGuard } from '@/auth/guards/local-auth.guard';
import { AuthCookiesService } from '@/auth/services/auth-cookies.service';
import { EmailVerificationService } from '@/auth/services/email-verification.service';
import { GoogleAuthFacade } from '@/auth/services/google-auth.facade';
import type { AuthRequest } from '@/auth/types/auth-request.type';
import { GoogleAuthUser } from '@/auth/types/google-auth-user.type';
import { LoginDto } from '@/users/dto/login.dto';
import { RegisterResponseDto } from '@/users/dto/register-resp.dto';
import { SignUpDto } from '@/users/dto/sign-up.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookiesService: AuthCookiesService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly googleAuthFacade: GoogleAuthFacade,
    private readonly configService: ConfigService,
  ) {}

  @ApiBody({ type: LoginDto })
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() _credentials: LoginDto,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(req.user);
    this.cookiesService.setAuthCookies(res, accessToken, refreshToken);
    return { status: 'success' };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    this.cookiesService.clearAuthCookies(res);
    return { status: 'success' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: AuthRequest) {
    return req.user;
  }

  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async refresh(@Res({ passthrough: true }) res: Response, @Req() req: AuthRequest) {
    const { accessToken, refreshToken } = await this.authService.generateTokens(req.user);
    this.cookiesService.setAuthCookies(res, accessToken, refreshToken);
    return { status: 'success' };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: RegisterResponseDto })
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  register(@Body() signupDTO: SignUpDto) {
    return this.authService.register(signupDTO);
  }

  @Get('confirm-email')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async confirmEmail(@Query('token') token: string, @Res() res: Response) {
    try {
      await this.emailVerificationService.confirmEmail(token);

      return res.redirect(
        this.buildEmailConfirmationRedirectUrl('success', 'Email confirmed successfully'),
      );
    } catch (error: unknown) {
      return res.redirect(
        this.buildEmailConfirmationRedirectUrl('error', this.extractErrorMessage(error)),
      );
    }
  }

  @Post('resend-confirmation')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  resendConfirmation(@Body('email') email: string) {
    return this.emailVerificationService.resendConfirmation(email);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Get('google')
  @UseGuards(GoogleOauthGuard)
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(GoogleOauthGuard)
  async googleCallback(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.googleAuthFacade.handleCallback(
      {
        googleUser: req.user as GoogleAuthUser,
        googleConnectToken: req.cookies.google_connect_token as string | undefined,
        redirectAfterLogin: req.cookies.redirect_after_login as string | undefined,
      },
      res,
    );
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Get('google/connect')
  @UseGuards(JwtAuthGuard)
  async googleConnect(@Req() req: AuthRequest, @Res({ passthrough: true }) res: Response) {
    return this.googleAuthFacade.startConnectFlow(req.user, res);
  }

  @Post('google/disconnect')
  @UseGuards(JwtAuthGuard)
  async googleDisconnect(@Req() req: AuthRequest) {
    return this.googleAuthFacade.disconnect(req.user);
  }

  private buildEmailConfirmationRedirectUrl(status: 'success' | 'error', message: string) {
    const clientUrl = this.configService.get<string>('CLIENT_URL') ?? 'http://localhost:5173';
    const redirectUrl = new URL('/email-confirmation', clientUrl);

    redirectUrl.searchParams.set('status', status);
    redirectUrl.searchParams.set('message', message);

    return redirectUrl.toString();
  }

  private extractErrorMessage(error: unknown) {
    if (error instanceof HttpException) {
      const response = error.getResponse();

      if (typeof response === 'string') {
        return response;
      }

      if (response !== null && typeof response === 'object' && 'message' in response) {
        const message = response.message;

        if (Array.isArray(message)) {
          return message[0] ?? 'Email confirmation failed';
        }

        if (typeof message === 'string') {
          return message;
        }
      }

      return error.message;
    }

    return 'Email confirmation failed';
  }
}
