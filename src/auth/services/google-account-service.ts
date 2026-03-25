import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { AuthService } from '@/auth/auth.service';
import { GOOGLE_CONNECT_TOKEN_TYPE } from '@/auth/constants/auth.constants';
import { UserValidatorService } from '@/auth/services/user-validator.service';
import { AuthUser } from '@/auth/types/auth-user.type';
import { GoogleAuthUser } from '@/auth/types/google-auth-user.type';
import { GoogleConnectTokenPayload } from '@/auth/types/google-connect-token-payload.type';
import { TokenPair } from '@/auth/types/token-pair.type';
import { AppLogger } from '@/logger/app-logger.service';
import { UsersService } from '@/users/users.service';

@Injectable()
export class GoogleAccountService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly logger: AppLogger,
    private readonly userValidatorService: UserValidatorService,
    private readonly authService: AuthService,
  ) {}

  async handleGoogleLogin(googleUser: GoogleAuthUser): Promise<TokenPair> {
    const user = await this.usersService.findOrCreateGoogleUser(googleUser);
    this.userValidatorService.ensureActive(user);
    return this.authService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }

  async connectGoogleAccount(currentUserId: string, googleUser: GoogleAuthUser): Promise<void> {
    const { email, googleId } = googleUser;
    const currentUser = await this.usersService.findById(currentUserId);

    this.userValidatorService.ensureActive(currentUser);

    const existingGoogleUser = await this.usersService.findByGoogleId(googleId);

    if (existingGoogleUser && existingGoogleUser.id !== currentUser.id) {
      this.logger.security('Google account linked to existing user', {
        email,
        userId: existingGoogleUser.id,
      });
      throw new ConflictException('Google account is already linked to another user');
    }

    if (currentUser.googleId && currentUser.googleId !== googleId) {
      throw new ConflictException('Another Google account is already linked to this user');
    }

    if (currentUser.email !== email) {
      throw new BadRequestException('Google email does not match current account email');
    }

    await this.usersService.updateById(currentUser.id, { googleId, isEmailConfirmed: true });
  }

  async disconnectGoogleAccount(
    authUser: AuthUser,
  ): Promise<{ status: 'success'; message: string }> {
    const foundUser = await this.usersService.findByIdForAuth(authUser.id);

    const user = this.userValidatorService.ensureUserExists(foundUser);
    this.userValidatorService.ensureActive(user);
    this.userValidatorService.ensureGoogleConnected(user);
    this.userValidatorService.ensureHasPassword(user);

    await this.usersService.disconnectGoogleById(user.id);

    return {
      status: 'success',
      message: 'Google account disconnected successfully',
    };
  }

  async createGoogleConnectToken(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: userId,
        type: GOOGLE_CONNECT_TOKEN_TYPE,
      },
      {
        secret: this.configService.getOrThrow<string>('GOOGLE_CONNECT_TOKEN_SECRET'),
        expiresIn: '10m',
      },
    );
  }

  async verifyGoogleConnectToken(token: string): Promise<GoogleConnectTokenPayload> {
    let payload: GoogleConnectTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<GoogleConnectTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('GOOGLE_CONNECT_TOKEN_SECRET'),
      });
    } catch {
      throw new ForbiddenException('Invalid or expired Google connect token');
    }

    if (payload.type !== GOOGLE_CONNECT_TOKEN_TYPE) {
      throw new ForbiddenException('Invalid token type');
    }

    return payload;
  }
}
