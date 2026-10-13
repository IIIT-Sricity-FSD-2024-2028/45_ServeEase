import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { successResponse } from '../../common/api-response';
import { LoginDto, RegisterDto } from './auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('login') login(@Body() body: LoginDto) { return successResponse(this.auth.login(body)); }
  @Post('register') register(@Body() body: RegisterDto) { return successResponse(this.auth.register(body)); }
  @Get('session') session(@Headers('authorization') auth: string) { return successResponse(this.auth.sessionUser(this.token(auth))); }
  @Post('logout') logout(@Headers('authorization') auth: string) { this.auth.logout(this.token(auth)); return successResponse({ loggedOut: true }); }
  private token(value?: string) { if (!value?.startsWith('Bearer ')) throw new Error('Missing authentication token.'); return value.slice(7); }
}
