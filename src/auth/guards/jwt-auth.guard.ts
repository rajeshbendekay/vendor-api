import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UsersService } from '../../users/users.service';

export interface AuthUser {
  id: number;
  role: string;
  investorId: number | null;
  returnPartyId: number | null;
}

interface JwtPayload {
  sub: number;
  role: string;
  investorId: number | null;
  returnPartyId: number | null;
}

// Registered globally as APP_GUARD (see auth.module.ts) — every route
// requires a valid bearer token by default; opt out with @Public().
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Missing bearer token');

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Loaded fresh from the DB (not trusted from the token) so a
    // deactivated account is rejected immediately, not just at token expiry.
    const user = await this.usersService.findActiveById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account no longer active');
    }

    const authUser: AuthUser = {
      id: user.id,
      role: user.role,
      investorId: user.investorId,
      returnPartyId: user.returnPartyId,
    };
    (request as Request & { user: AuthUser }).user = authUser;
    return true;
  }

  private extractToken(request: Request): string | null {
    const header = request.headers?.authorization;
    if (!header || typeof header !== 'string') return null;
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return null;
    return token;
  }
}
