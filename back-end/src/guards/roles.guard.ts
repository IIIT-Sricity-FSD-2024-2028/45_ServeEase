import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AppRole, DEPARTMENTS_KEY, ROLES_KEY } from './roles.decorator';
import { AuthService } from '../modules/auth/auth.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;
    const token = typeof authorization === 'string' && authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) throw new ForbiddenException('Authentication is required.');
    let principal;
    // A refused session (e.g. a suspended customer) keeps its specific message; anything else is generic.
    try { principal = this.authService.principal(token); } catch (error) { throw error instanceof ForbiddenException ? error : new ForbiddenException('Authentication is required.'); }
    const authorizationRole = principal.role === 'customer' ? 'user' : principal.role === 'superuser' ? 'admin' : principal.role;

    if (!requiredRoles.includes(String(authorizationRole).toLowerCase() as AppRole)) {
      throw new ForbiddenException('You do not have permission to access this resource.');
    }

    // Employees share the 'support' role; their workspace is decided by the department on their
    // server-side employee record. Routes that do not name departments stay Support-only.
    if (authorizationRole === 'support') {
      const allowedDepartments = this.reflector.getAllAndOverride<string[]>(DEPARTMENTS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || ['Support'];
      if (!principal.department || !allowedDepartments.includes(principal.department)) {
        throw new ForbiddenException('Your department does not have access to this resource.');
      }
    }

    request.auth = principal;
    // Compatibility consumers receive only identity derived from the session.
    (request.headers as Record<string, string | undefined>)['user-id'] = principal.userId;
    (request.headers as Record<string, string | undefined>)['user-email'] = principal.email;
    (request.headers as Record<string, string | undefined>).role = principal.role === 'superuser' ? 'admin' : principal.role;

    return true;
  }
}
