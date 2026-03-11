import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
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
import { LoginDto } from '@/auth/login.dto';
import type { AuthRequest } from '@/auth/types/auth-request.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiBody({ type: LoginDto })
  @Post('login')
  @UseGuards(LocalAuthGuard)
  async login(
    @Body() _credentials: LoginDto,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.generateTokens(req.user);

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
}
