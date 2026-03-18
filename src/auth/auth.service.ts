import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { CryptoService } from '@/auth/crypto/crypto.service';
import { AuthUser } from '@/auth/types/auth-user.type';
import { JwtPayload } from '@/auth/types/jwt-payload.type';
import { TokenPair } from '@/auth/types/token-pair.type';
import { RegisterResponseDto } from '@/users/dto/register-resp.dto';
import { SignUpDto } from '@/users/dto/sign-up.dto';
import { Role } from '@/users/enums/Role';
import { UsersService } from '@/users/users.service';

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

  async login(user: AuthUser): Promise<TokenPair> {
    const tokens = await this.generateTokens(user);

    return { ...tokens };
  }

  async register(dto: SignUpDto): Promise<RegisterResponseDto> {
    await this.userService.ensureEmailNotTaken(dto.email);

    const passwordHash = await this.cryptoService.hashPassword(dto.password);

    await this.userService.create({
      email: dto.email,
      passwordHash,
      role: Role.CUSTOMER,
    });

    return {
      status: 'success',
      message: 'User created successfully.',
    };
  }

  async validateUser(email: string, password: string): Promise<AuthUser> {
    const user = await this.userService.findByEmailForAuth(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.cryptoService.comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
