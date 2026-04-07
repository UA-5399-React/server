import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Token } from 'graphql/language';

import { CryptoService } from '@/auth/crypto/crypto.service';
import { TokenSchema } from '@/auth/tokens/token.schema';
import { TokensService } from '@/auth/tokens/tokens.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }])],
  providers: [TokensService, CryptoService],
  exports: [TokensService],
})
export class TokensModule {}
