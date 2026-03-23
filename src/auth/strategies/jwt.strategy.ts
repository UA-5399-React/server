import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthUser } from '@/auth/types/auth-user.type';
import { JwtPayload } from '@/auth/types/jwt-payload.type';
import { AppLogger } from '@/logger/app-logger.service';
import { UsersService } from '@/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly usersService: UsersService,
    private readonly logger: AppLogger,
  ) {
    super({
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request | undefined) => {
          return req?.cookies?.accessToken ?? null;
        },
      ]),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      this.logger.security('Blocked inactive user access', {
        id: payload.sub,
        email: payload.email,
      });
      throw new ForbiddenException('User account is deactivated');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
