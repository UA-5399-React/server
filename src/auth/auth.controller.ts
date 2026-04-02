import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiCreatedResponse } from '@nestjs/swagger';
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
  async refresh(@Res({ passthrough: true }) res: Response, @Req() req: AuthRequest) {
    const { accessToken, refreshToken } = await this.authService.generateTokens(req.user);
    this.cookiesService.setAuthCookies(res, accessToken, refreshToken);
    return { status: 'success' };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: RegisterResponseDto })
  register(@Body() signupDTO: SignUpDto) {
    return this.authService.register(signupDTO);
  }

  @Post('confirm-email')
  confirmEmail(@Body('token') token: string) {
    return this.emailVerificationService.confirmEmail(token);
  }

  @Post('resend-confirmation')
  resendConfirmation(@Body('email') email: string) {
    return this.emailVerificationService.resendConfirmation(email);
  }

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
}
