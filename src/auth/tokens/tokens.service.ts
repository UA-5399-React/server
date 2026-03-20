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
  }): Promise<Token> {
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
}
