import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

import { BASE_COOKIE_OPTIONS } from '@/auth/constants/auth.constants';

@Injectable()
export class RedirectUrlMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (req.path === '/auth/google') {
      const redirect = typeof req.query.redirect === 'string' ? req.query.redirect : '/';

      const redirectPath = redirect.startsWith('/') ? redirect : '/';

      res.cookie('redirect_after_login', redirectPath, {
        ...BASE_COOKIE_OPTIONS,
        maxAge: 5 * 60 * 1000,
      });
    }
    next();
  }
}
