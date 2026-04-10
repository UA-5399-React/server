import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TokenType } from '@/auth/tokens/token.schema';
import { TokensService } from '@/auth/tokens/tokens.service';
import { MailService } from '@/mailer/mailer.service';
import { UserDocument } from '@/users/entities/user.schema';
import { UsersService } from '@/users/users.service';

const EMAIL_CONFIRMATION_FRONTEND_ROUTE = '/email-confirmation';

@Injectable()
export class EmailVerificationService {
  private static readonly EMAIL_CONFORMATION_TTL_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly userService: UsersService,
    private readonly tokensService: TokensService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async createAndSendVerification(user: UserDocument) {
    const { rawToken, tokenHash, expiresAt } = this.tokensService.createTokenData(
      EmailVerificationService.EMAIL_CONFORMATION_TTL_MS,
    );

    const token = await this.tokensService.createToken({
      userId: user.id,
      type: TokenType.EMAIL_VERIFICATION,
      tokenHash,
      expiresAt,
    });

    const verifyUrl = this.buildEmailVerificationUrl(rawToken);

    try {
      await this.mailService.sendEmailVerification(user.email, verifyUrl);
    } catch (error) {
      try {
        await this.tokensService.deleteById(token._id.toString());
      } catch {
        // ignore cleanup error
      }
      throw error;
    }
  }

  async confirmEmail(token: string) {
    const tokenDoc = await this.tokensService.findValidTokenOrThrow(
      token,
      TokenType.EMAIL_VERIFICATION,
    );

    const user = await this.userService.findById(tokenDoc.userId.toString());

    user.isEmailConfirmed = true;
    await user.save();

    await this.tokensService.markAsUsed(tokenDoc.id);

    return {
      message: 'Email confirmed successfully',
    };
  }

  async resendConfirmation(email: string) {
    const neutralMessage = {
      message:
        'If the account exists and is not yet confirmed, a confirmation email has been sent.',
    };

    const user = await this.userService.findByEmail(email);

    if (!user || user.isEmailConfirmed) {
      return neutralMessage;
    }

    await this.tokensService.ensureCooldownOrThrow(
      user.id,
      TokenType.EMAIL_VERIFICATION,
      60 * 1000,
    );

    await this.tokensService.deleteByUserAndType(user.id, TokenType.EMAIL_VERIFICATION);

    await this.createAndSendVerification(user);

    return {
      message: 'Confirmation email sent.',
    };
  }

  buildEmailVerificationUrl(token: string): string {
    const verificationUrl = new URL(
      EMAIL_CONFIRMATION_FRONTEND_ROUTE,
      this.configService.getOrThrow<string>('CLIENT_URL'),
    );

    verificationUrl.searchParams.set('token', token);

    return verificationUrl.toString();
  }
}
