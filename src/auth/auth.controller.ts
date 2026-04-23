// api/src/auth/auth.controller.ts
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from '../services/auth';
import { JwtAuthGuard } from './jwt.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {} // <-- important

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const u = await this.auth.validateUser(String(body.email ?? ''), String(body.password ?? ''));
    return this.auth.sign(u);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return this.auth.me(req.user.userId);
  }
}
