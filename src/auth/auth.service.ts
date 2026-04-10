import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { CryptoService } from '@/auth/crypto/crypto.service';
import { EmailVerificationService } from '@/auth/services/email-verification.service';
import { UserValidatorService } from '@/auth/services/user-validator.service';
import { AuthUser } from '@/auth/types/auth-user.type';
import { JwtPayload } from '@/auth/types/jwt-payload.type';
import { TokenPair } from '@/auth/types/token-pair.type';
import { AppLogger } from '@/logger/app-logger.service';
import { RegisterResponseDto } from '@/users/dto/register-resp.dto';
import { SignUpDto } from '@/users/dto/sign-up.dto';
import { Role } from '@/users/enums/role.enum';
import { UsersService } from '@/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
    private readonly cryptoService: CryptoService,
    private readonly logger: AppLogger,
    private readonly userValidatorService: UserValidatorService,
    private readonly emailVerificationService: EmailVerificationService,
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

    const createdUser = await this.userService.create({
      email: dto.email,
      passwordHash,
      role: Role.CUSTOMER,
      firstName: dto.firstName,
      ...(dto.lastName && { lastName: dto.lastName }),
    });

    try {
      await this.emailVerificationService.createAndSendVerification(createdUser);
    } catch (error) {
      this.logger.error('Failed to send verification email', error);
      return {
        status: 'pending_verification',
        message:
          'User created successfully, but verification email could not be sent. Please request a new verification email.',
      };
    }

    return {
      status: 'success',
      message: 'User created successfully. Please check your email to verify your account.',
    };
  }

  async validateUser(email: string, password: string): Promise<AuthUser> {
    const user = await this.userService.findByEmailForAuth(email);

    if (!user) {
      this.logger.security('Login failed: user not found', { email });
      throw new UnauthorizedException('Invalid credentials');
    }

    this.userValidatorService.ensureActive(user);

    if (!user.passwordHash) {
      this.logger.security('Login failed: password login is not available', {
        id: user.id,
        email: user.email,
        role: user.role,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.cryptoService.comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      this.logger.security('Login failed: invalid password', {
        id: user.id,
        email: user.email,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    this.userValidatorService.ensureEmailConfirmed(user);

    this.userService.updateLastLogin(user.id).catch((err: unknown) => {
      this.logger.warn('Failed to update lastLoginAt', {
        userId: user.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    this.logger.info('User authenticated successfully', {
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
