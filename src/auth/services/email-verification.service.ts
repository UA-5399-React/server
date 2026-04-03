import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ROUTES } from '@/auth/constants';
import { CryptoService } from '@/auth/crypto/crypto.service';
import { TokenType } from '@/auth/tokens/token.schema';
import { TokensService } from '@/auth/tokens/tokens.service';
import { MailService } from '@/mailer/mailer.service';
import { UserDocument } from '@/users/entities/user.schema';
import { UsersService } from '@/users/users.service';

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
    const neutralMessage = {
      message:
        'If the account exists and is not yet confirmed, a confirmation email has been sent.',
    };

    const user = await this.userService.findByEmail(email);

    if (!user || user.isEmailConfirmed) {
      return neutralMessage;
    }

    await this.ensureConfirmationCooldown(user);

    await this.tokensService.deleteByUserAndType(user.id, TokenType.EMAIL_VERIFICATION);

    await this.createAndSendVerification(user);

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
    return `${this.configService.getOrThrow<string>('BACKEND_URL')}${ROUTES.AUTH.CONFIRM_EMAIL}?token=${token}`;
  }

  private async ensureConfirmationCooldown(user: UserDocument) {
    const existingToken = await this.tokensService.findActiveByUserAndType(
      user.id,
      TokenType.EMAIL_VERIFICATION,
    );

    if (existingToken?.createdAt) {
      const cooldownSeconds = 60 * 1000;
      const diff = Date.now() - new Date(existingToken.createdAt).getTime();

      if (diff < cooldownSeconds) {
        throw new HttpException(
          'Please wait before requesting another confirmation email.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }
}
