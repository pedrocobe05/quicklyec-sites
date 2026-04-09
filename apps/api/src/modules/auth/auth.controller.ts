import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { minutes, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: minutes(1) } })
  login(@Body() input: LoginDto) {
    return this.authService.login(input);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: minutes(1) } })
  refresh(@Body() input: RefreshTokenDto) {
    return this.authService.refresh(input.refreshToken);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: minutes(15) } })
  forgotPassword(@Body() input: ForgotPasswordDto) {
    return this.authService.forgotPassword(input.email);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: minutes(15) } })
  resetPassword(@Body() input: ResetPasswordDto) {
    return this.authService.resetPassword(input.token, input.password);
  }
}
