import type { Request } from 'express';

import type { AuthUser } from './auth-user.type';

export type AuthRequest = Request & {
  user: AuthUser;
};
