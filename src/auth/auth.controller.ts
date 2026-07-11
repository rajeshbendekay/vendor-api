import { Body, Controller, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Lightweight single shared-password gate. Not per-user auth — it simply checks
// the submitted password against APP_PASSWORD so the secret never ships in the
// frontend bundle. Suitable for an internal tool on a trusted network.
@Controller('auth')
export class AuthController {
  constructor(private readonly config: ConfigService) {}

  @Post('login')
  login(@Body('password') password: string) {
    const expected = this.config.get<string>('APP_PASSWORD', 'flexsignage');
    return { ok: typeof password === 'string' && password === expected };
  }
}
