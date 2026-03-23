import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthUser } from '@/auth/types/auth-user.type';
import type { JwtPayload } from '@/auth/types/jwt-payload.type';
import { UsersService } from '@/users/users.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly usersService: UsersService) {
    super({
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_REFRESH_SECRET,
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request | undefined) => {
          return req?.cookies?.refreshToken ?? null;
        },
      ]),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }
    const user = await this.usersService.findById(payload.sub);
    if (!user.isEmailConfirmed) {
      throw new UnauthorizedException('Please confirm your email first');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('User account is deactivated');
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
