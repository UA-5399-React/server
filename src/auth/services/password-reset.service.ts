import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ROUTES } from '@/auth/constants';
import { CryptoService } from '@/auth/crypto/crypto.service';
import { UserValidatorService } from '@/auth/services/user-validator.service';
import { TokenType } from '@/auth/tokens/token.schema';
import { TokensService } from '@/auth/tokens/tokens.service';
import { MailService } from '@/mailer/mailer.service';
import { UserDocument } from '@/users/entities/user.schema';
import { UsersService } from '@/users/users.service';

@Injectable()
export class PasswordResetService {
  private static readonly RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly usersService: UsersService,
    private readonly userValidator: UserValidatorService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly cryptoService: CryptoService,
    private readonly tokensService: TokensService,
  ) {}

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const neutralMessage = {
      message: 'If the account exists, a reset link has been sent.',
    };

    const user = await this.usersService.findByEmail(email);

    if (!user || !user.isEmailConfirmed) {
      return neutralMessage;
    }

    this.userValidator.ensureEmailConfirmed(user);

    await this.tokensService.ensureCooldownOrThrow(user.id, TokenType.PASSWORD_RESET, 60 * 1000);

    await this.createAndSendResetToken(user);

    return {
      message: 'Please check your email, a reset link has been sent',
    };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const tokenDoc = await this.tokensService.findValidTokenOrThrow(
      token,
      TokenType.PASSWORD_RESET,
    );

    const foundUser = await this.usersService.findById(tokenDoc.userId.toString());
    const user = this.userValidator.ensureUserExists(foundUser);

    user.passwordHash = await this.cryptoService.hashPassword(newPassword);

    await user.save();

    await this.tokensService.deleteByUserAndType(user.id, TokenType.PASSWORD_RESET);

    return {
      message: 'Password changed successfully',
    };
  }

  async createAndSendResetToken(user: UserDocument): Promise<void> {
    await this.tokensService.deleteByUserAndType(user.id, TokenType.PASSWORD_RESET);

    const { rawToken, tokenHash, expiresAt } = this.tokensService.createTokenData(
      PasswordResetService.RESET_TOKEN_TTL_MS,
    );

    const token = await this.tokensService.createToken({
      userId: user.id,
      type: TokenType.PASSWORD_RESET,
      tokenHash,
      expiresAt,
    });

    const resetUrl = this.buildResetPasswordUrl(rawToken);

    try {
      await this.mailService.sendResetPasswordToken(user.email, resetUrl);
    } catch (error) {
      try {
        await this.tokensService.deleteById(token._id.toString());
      } catch {
        // ignore cleanup error
      }
      throw error;
    }
  }

  private buildResetPasswordUrl(token: string): string {
    return `${this.configService.getOrThrow<string>('CLIENT_URL')}${ROUTES.AUTH.RESET_PASSWORD}?token=${token}`;
  }
}
