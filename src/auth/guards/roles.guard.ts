import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';

import { ROLES_KEY } from '@/auth/decorators/Roles';
import { AuthRequest, GraphqlContextWithUser } from '@/auth/types/auth-request.type';
import { AuthUser } from '@/auth/types/auth-user.type';
import { AppLogger } from '@/logger/app-logger.service';
import { Role } from '@/users/enums/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: AppLogger,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    let user: AuthUser | undefined;
    let path: string | undefined;

    if (context.getType<'http' | 'graphql'>() === 'http') {
      const request = context.switchToHttp().getRequest<AuthRequest>();
      user = request.user;
      path = request.url;
    } else {
      const gqlContext = GqlExecutionContext.create(context).getContext<GraphqlContextWithUser>();
      user = gqlContext.req.user;
      path = 'graphql';
    }

    if (!user) {
      this.logger.security('Unauthorized access attempt', { path });
      throw new ForbiddenException('Access denied');
    }

    if (!requiredRoles.includes(user.role)) {
      this.logger.security('Access denied (role mismatch)', {
        id: user.id,
        userRole: user.role,
        requiredRoles,
        path,
      });
      throw new ForbiddenException('Access denied');
    }

    return true;
  }
}
