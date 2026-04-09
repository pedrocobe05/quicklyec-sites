import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
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
  login(@Body() input: LoginDto) {
    return this.authService.login(input);
  }

  @Post('refresh')
  refresh(@Body() input: RefreshTokenDto) {
    return this.authService.refresh(input.refreshToken);
  }

  @Post('forgot-password')
  forgotPassword(@Body() input: ForgotPasswordDto) {
    return this.authService.forgotPassword(input.email);
  }

  @Post('reset-password')
  resetPassword(@Body() input: ResetPasswordDto) {
    return this.authService.resetPassword(input.token, input.password);
  }
}
