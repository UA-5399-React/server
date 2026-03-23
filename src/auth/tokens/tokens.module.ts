import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Token } from 'graphql/language';

import { TokenSchema } from '@/auth/tokens/token.schema';
import { TokensService } from '@/auth/tokens/tokens.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }])],
  providers: [TokensService],
  exports: [TokensService],
})
export class TokensModule {}
