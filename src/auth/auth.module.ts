import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { CryptoModule } from '@/auth/crypto/crypto.module';
import { RedirectUrlMiddleware } from '@/auth/middleware/redirect-url.middleware';
import { AuthCookiesService } from '@/auth/services/auth-cookies.service';
import { EmailVerificationService } from '@/auth/services/email-verification.service';
import { GoogleAccountService } from '@/auth/services/google-account.service';
import { GoogleAuthFacade } from '@/auth/services/google-auth.facade';
import { UserValidatorService } from '@/auth/services/user-validator.service';
import { GoogleStrategy } from '@/auth/strategies/google.strategy';
import { JwtStrategy } from '@/auth/strategies/jwt.strategy';
import { JwtRefreshStrategy } from '@/auth/strategies/jwt-refresh.strategy';
import { LocalStrategy } from '@/auth/strategies/local.strategy';
import { TokensModule } from '@/auth/tokens/tokens.module';
import { MailService } from '@/mailer/mailer.service';
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
  exports: [AuthService, AuthCookiesService],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
    MailService,
    GoogleAccountService,
    EmailVerificationService,
    UserValidatorService,
    AuthCookiesService,
    GoogleAuthFacade,
  ],
  controllers: [AuthController],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RedirectUrlMiddleware).forRoutes('/auth/google');
  }
}
