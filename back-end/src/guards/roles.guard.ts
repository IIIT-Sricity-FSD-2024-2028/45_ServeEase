import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AppRole, ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const roleHeader = request.headers.role;
    const role = Array.isArray(roleHeader) ? roleHeader[0] : roleHeader;

    if (!role || !requiredRoles.includes(String(role).toLowerCase() as AppRole)) {
      throw new ForbiddenException('You do not have permission to access this resource.');
    }

    return true;
  }
}
