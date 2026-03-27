import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

import { ROUTES } from '@/auth/constants';
import { AppLogger } from '@/logger/app-logger.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly logger: AppLogger,
    private readonly configService: ConfigService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: `${configService.getOrThrow<string>('BACKEND_URL')}${ROUTES.AUTH.GOOGLE_CALLBACK}`,
      scope: ['email', 'profile'],
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      this.logger.warn('Google auth failed: email not provided', {
        provider: 'google',
        profileId: profile.id,
      });
      return null;
    }

    return {
      email,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      googleId: profile.id,
      avatarUrl: profile.photos?.[0]?.value,
      provider: 'google',
    };
  }
}
