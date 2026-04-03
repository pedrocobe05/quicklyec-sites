import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

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
}
