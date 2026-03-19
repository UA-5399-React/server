import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { CryptoService } from '@/auth/crypto/crypto.service';
import { JwtPayload } from '@/auth/types/jwt-payload.type';
import { RegisterResponseDto } from '@/users/dto/register-resp.dto';
import { SignUpDto } from '@/users/dto/sign-up.dto';
import { Role } from '@/users/enums/Role';
import { UsersService } from '@/users/users.service';

type AuthUser = {
  id: string;
  email: string;
  role: string;
};

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
    private readonly cryptoService: CryptoService,
  ) {}

  async generateTokens(user: AuthUser): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    const refreshSecret = this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async register(dto: SignUpDto) {
    await this.userService.ensureEmailNotTaken(dto.email);

    const passwordHash = await this.cryptoService.hashPassword(dto.password);

    await this.userService.create({
      email: dto.email,
      passwordHash,
      role: Role.CUSTOMER,
    });

    const response: RegisterResponseDto = {
      status: 'success',
      message: 'User created successfully.',
    };

    return response;
  }
}
