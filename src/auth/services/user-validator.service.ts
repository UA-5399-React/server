import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AppLogger } from '@/logger/app-logger.service';
import { UserDocument } from '@/users/entities/user.schema';

@Injectable()
export class UserValidatorService {
  constructor(private readonly logger: AppLogger) {}

  ensureUserExists(user: UserDocument | null): UserDocument {
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  ensureActive(user: UserDocument): void {
    if (!user.isActive) {
      this.logger.security('Blocked inactive user access', {
        id: user.id,
        email: user.email,
        role: user.role,
      });
      throw new ForbiddenException('User account is deactivated');
    }
  }

  ensureEmailConfirmed(user: UserDocument): void {
    if (!user.isEmailConfirmed) {
      this.logger.security('Login blocked: email not confirmed', {
        id: user.id,
        email: user.email,
      });
      throw new UnauthorizedException({
        message: 'Please confirm your email first',
        code: 'EMAIL_NOT_CONFIRMED',
      });
    }
  }

  ensureGoogleConnected(user: UserDocument): void {
    if (!user.googleId) {
      throw new ConflictException('Google account is not connected');
    }
  }

  ensureHasPassword(user: UserDocument): void {
    if (!user.passwordHash) {
      throw new BadRequestException('You must set a password before disconnecting Google');
    }
  }
}
