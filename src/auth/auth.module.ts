import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { CryptoModule } from '@/auth/crypto/crypto.module';
import { JwtStrategy } from '@/auth/strategies/jwt.strategy';
import { JwtRefreshStrategy } from '@/auth/strategies/jwt-refresh.strategy';
import { LocalStrategy } from '@/auth/strategies/local.strategy';
import { TokensModule } from '@/auth/tokens/tokens.module';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [
    PassportModule,
    CryptoModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    UsersModule,
    TokensModule,
  ],
  exports: [AuthService],
  providers: [AuthService, JwtStrategy, LocalStrategy, JwtRefreshStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
