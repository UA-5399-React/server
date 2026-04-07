import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Token, TokenDocument, TokenType } from '@/auth/tokens/token.schema';

@Injectable()
export class TokensService {
  constructor(
    @InjectModel(Token.name)
    private readonly tokenModel: Model<TokenDocument>,
  ) {}

  async createToken(params: {
    userId: string;
    type: TokenType;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<TokenDocument> {
    return this.tokenModel.create(params);
  }

  async findByTokenHash(tokenHash: string, type: TokenType) {
    return this.tokenModel.findOne({
      tokenHash,
      type,
      usedAt: null,
    });
  }

  async markAsUsed(id: string) {
    return this.tokenModel.findByIdAndUpdate(id, {
      usedAt: new Date(),
    });
  }

  async deleteByUserAndType(userId: string, type: TokenType): Promise<void> {
    await this.tokenModel.deleteMany({ userId, type });
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

  async deleteAllForUser(userId: string): Promise<void> {
    await this.tokenModel.deleteMany({ userId }).exec();
  }
}
