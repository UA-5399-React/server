import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { CryptoService } from '@/auth/crypto/crypto.service';
import { TokenType } from '@/auth/tokens/token.schema';
import { TokensService } from '@/auth/tokens/tokens.service';
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
    private readonly tokensService: TokensService,
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
    const { rawToken, tokenHash, expiresAt } = this.createEmailVerificationData();

    const createdUser = await this.userService.create({
      email: dto.email,
      passwordHash,
      role: Role.CUSTOMER,
    });

    await this.tokensService.createToken({
      userId: createdUser.id,
      type: TokenType.EMAIL_VERIFICATION,
      tokenHash,
      expiresAt,
    });

    return {
      status: 'success',
      message: 'User created successfully.',
      verifyUrl: `http://localhost:3000/confirm-email?token=${rawToken}`,
    };
  }

  async validateUser(email: string, password: string): Promise<AuthUser> {
    const user = await this.userService.findByEmailForAuth(email);

    if (!user) {
      this.logger.security('Login failed: user not found', { email });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      this.logger.security('Blocked inactive user access', {
        id: user.id,
        email: user.email,
        role: user.role,
      });
      throw new ForbiddenException('User account is deactivated');
    }
    const isPasswordValid = await this.cryptoService.comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      this.logger.security('Login failed: invalid password', {
        id: user.id,
        email: user.email,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailConfirmed) {
      this.logger.security('Login blocked: email not confirmed', {
        id: user.id,
        email: user.email,
      });
      throw new UnauthorizedException('Please confirm your email first');
    }

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
  async confirmEmail(token: string): Promise<void> {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    const tokenHash = this.cryptoService.generateSha256HashBase64(token);

    const tokenDoc = await this.tokensService.findByTokenHash(
      tokenHash,
      TokenType.EMAIL_VERIFICATION,
    );

    if (!tokenDoc) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (tokenDoc.expiresAt < new Date()) {
      throw new BadRequestException('Token expired');
    }

    const user = await this.userService.findById(tokenDoc.userId.toString());

    user.isEmailConfirmed = true;
    await user.save();

    await this.tokensService.markAsUsed(tokenDoc.id);
  }

  async resendConfirmation(email: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      return { message: 'If this email exists, a confirmation link was sent.' };
    }
    if (user.isEmailConfirmed) {
      return { message: 'Email is already confirmed.' };
    }
    await this.tokensService.deleteByUserAndType(user.id, TokenType.EMAIL_VERIFICATION);

    const { rawToken, tokenHash, expiresAt } = this.createEmailVerificationData();

    await this.tokensService.createToken({
      userId: user.id,
      type: TokenType.EMAIL_VERIFICATION,
      tokenHash,
      expiresAt,
    });

    return {
      message: 'Confirmation email sent.',
      verifyUrl: `http://localhost:3000/confirm-email?token=${rawToken}`,
    };
  }

  private createEmailVerificationData() {
    const rawToken = this.cryptoService.generateRandomToken();
    const tokenHash = this.cryptoService.generateSha256HashBase64(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return {
      rawToken,
      tokenHash,
      expiresAt,
    };
  }
}
