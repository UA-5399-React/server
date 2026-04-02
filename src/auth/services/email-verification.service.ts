import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CryptoService } from '@/auth/crypto/crypto.service';
import { TokenType } from '@/auth/tokens/token.schema';
import { TokensService } from '@/auth/tokens/tokens.service';
import { MailService } from '@/mailer/mailer.service';
import { UserDocument } from '@/users/entities/user.schema';
import { UsersService } from '@/users/users.service';

const EMAIL_CONFIRMATION_FRONTEND_ROUTE = '/email-confirmation';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly userService: UsersService,
    private readonly cryptoService: CryptoService,
    private readonly tokensService: TokensService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async createAndSendVerification(user: UserDocument) {
    const { rawToken, tokenHash, expiresAt } = this.createEmailVerificationData();

    await this.tokensService.createToken({
      userId: user.id,
      type: TokenType.EMAIL_VERIFICATION,
      tokenHash,
      expiresAt,
    });

    const verifyUrl = this.buildEmailVerificationUrl(rawToken);

    await this.mailService.sendEmailVerification(user.email, verifyUrl);
  }

  async confirmEmail(token: string) {
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

    return {
      message: 'Email confirmed successfully',
    };
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

    const verifyUrl = this.buildEmailVerificationUrl(rawToken);

    await this.mailService.sendEmailVerification(user.email, verifyUrl);

    return {
      message: 'Confirmation email sent.',
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

  buildEmailVerificationUrl(token: string): string {
    const verificationUrl = new URL(
      EMAIL_CONFIRMATION_FRONTEND_ROUTE,
      this.configService.getOrThrow<string>('CLIENT_URL'),
    );

    verificationUrl.searchParams.set('token', token);

    return verificationUrl.toString();
  }
}
