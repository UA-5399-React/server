import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { MOCK_USER } from '@/auth/auth.mock';
import { AuthUser } from '@/auth/types/auth-user.type';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor() {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<AuthUser> {
    if (MOCK_USER.email !== email || MOCK_USER.password !== password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      id: MOCK_USER.id,
      email: MOCK_USER.email,
      role: MOCK_USER.role,
    };
  }
}
