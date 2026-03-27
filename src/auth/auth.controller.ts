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
import type { Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import {
  ACCESS_TOKEN_COOKIE_OPTIONS,
  BASE_COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE_OPTIONS,
} from '@/auth/constants/auth.constants';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from '@/auth/guards/jwt-refresh.guard';
import { LocalAuthGuard } from '@/auth/guards/local-auth.guard';
import type { AuthRequest } from '@/auth/types/auth-request.type';
import { LoginDto } from '@/users/dto/login.dto';
import { RegisterResponseDto } from '@/users/dto/register-resp.dto';
import { SignUpDto } from '@/users/dto/sign-up.dto';

type RedirectResponse = Pick<Response, 'redirect'>;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @ApiBody({ type: LoginDto })
  @Post('login')
  @UseGuards(LocalAuthGuard)
  async login(
    @Body() _credentials: LoginDto,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(req.user);

    this.setAuthCookies(res, accessToken, refreshToken);

    return { status: 'success' };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    this.clearAuthCookies(res);

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: AuthRequest) {
    return req.user;
  }

  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  async refresh(@Res({ passthrough: true }) res: Response, @Req() req: AuthRequest) {
    const { accessToken, refreshToken } = await this.authService.generateTokens(req.user);

    this.setAuthCookies(res, accessToken, refreshToken);

    return { status: 'success' };
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('accessToken', accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
    res.cookie('refreshToken', refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('accessToken', BASE_COOKIE_OPTIONS);
    res.clearCookie('refreshToken', BASE_COOKIE_OPTIONS);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: RegisterResponseDto })
  async register(@Body() signupDTO: SignUpDto) {
    return await this.authService.register(signupDTO);
  }

  @Get('confirm-email')
  async confirmEmail(@Query('token') token: string, @Res() res: RedirectResponse) {
    try {
      await this.authService.confirmEmail(token);

      return res.redirect(
        this.buildEmailConfirmationRedirectUrl('success', 'Email confirmed successfully'),
      );
    } catch (error) {
      return res.redirect(
        this.buildEmailConfirmationRedirectUrl('error', this.extractErrorMessage(error)),
      );
    }
  }

  @Post('resend-confirmation')
  async resendConfirmation(@Body('email') email: string) {
    return this.authService.resendConfirmation(email);
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
