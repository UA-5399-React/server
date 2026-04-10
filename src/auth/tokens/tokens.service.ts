import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CryptoService } from '@/auth/crypto/crypto.service';
import { Token, TokenDocument, TokenType } from '@/auth/tokens/token.schema';

@Injectable()
export class TokensService {
  constructor(
    @InjectModel(Token.name)
    private readonly tokenModel: Model<TokenDocument>,
    private readonly cryptoService: CryptoService,
  ) {}

  async createToken(params: {
    userId: string;
    type: TokenType;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<TokenDocument> {
    return this.tokenModel.create(params);
  }

  async findByTokenHash(tokenHash: string, type: TokenType): Promise<TokenDocument | null> {
    return this.tokenModel
      .findOne({
        tokenHash,
        type,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .exec();
  }

  async markAsUsed(id: string): Promise<void> {
    await this.tokenModel
      .findByIdAndUpdate(id, {
        usedAt: new Date(),
      })
      .exec();
  }

  async deleteByUserAndType(userId: string, type: TokenType): Promise<void> {
    await this.tokenModel.deleteMany({ userId, type }).exec();
  }

  async findActiveByUserAndType(userId: string, type: TokenType): Promise<TokenDocument | null> {
    return this.tokenModel
      .findOne({
        userId,
        type,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async deleteById(id: string): Promise<void> {
    await this.tokenModel.findByIdAndDelete(id).exec();
  }

  createTokenData(ttlMs: number): { rawToken: string; tokenHash: string; expiresAt: Date } {
    const rawToken = this.cryptoService.generateRandomToken();
    const tokenHash = this.cryptoService.generateSha256HashBase64(rawToken);

    return {
      rawToken,
      tokenHash,
      expiresAt: new Date(Date.now() + ttlMs),
    };
  }

  async findValidTokenOrThrow(token: string, type: TokenType): Promise<TokenDocument> {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    const tokenHash = this.cryptoService.generateSha256HashBase64(token);

    const tokenDoc = await this.findByTokenHash(tokenHash, type);

    if (!tokenDoc) {
      throw new BadRequestException('Invalid or expired token');
    }
    return tokenDoc;
  }
  async ensureCooldownOrThrow(userId: string, type: TokenType, cooldownMs: number): Promise<void> {
    const existingToken = await this.findActiveByUserAndType(userId, type);

    if (existingToken?.createdAt) {
      const diff = Date.now() - new Date(existingToken.createdAt).getTime();

      if (diff < cooldownMs) {
        throw new HttpException(
          'Please wait before requesting another action.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }
  async deleteAllForUser(userId: string): Promise<void> {
    await this.tokenModel.deleteMany({ userId }).exec();
  }
}
