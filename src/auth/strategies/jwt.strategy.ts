import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UserValidatorService } from '@/auth/services/user-validator.service';
import { AuthUser } from '@/auth/types/auth-user.type';
import { JwtPayload } from '@/auth/types/jwt-payload.type';
import { AppLogger } from '@/logger/app-logger.service';
import { UsersService } from '@/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly usersService: UsersService,
    private readonly logger: AppLogger,
    private readonly configService: ConfigService,
    private readonly userValidator: UserValidatorService,
  ) {
    super({
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
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

    this.userValidator.ensureActive(user);
    this.userValidator.ensureEmailConfirmed(user);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
