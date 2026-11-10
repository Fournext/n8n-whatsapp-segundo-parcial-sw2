import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Protege los endpoints internos del bridge (llamados por n8n).
 * Requiere el header x-bridge-api-key.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const key = req.headers['x-bridge-api-key'];
    const expected = this.config.get<string>('BRIDGE_API_KEY');
    if (!key || key !== expected) {
      throw new UnauthorizedException('API key inválida o ausente');
    }
    return true;
  }
}
