import type { ApiResponse, GoogleAuthResult, LoginResult, User } from '@nest-vue/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import type { RequestAuthUser } from './auth.types';
import { CurrentUser } from './current-user.decorator';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { GoogleOnboardingDto } from './dto/google-onboarding.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<ApiResponse<LoginResult>> {
    return { data: await this.authService.register(dto) };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<ApiResponse<LoginResult>> {
    return { data: await this.authService.login(dto) };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto): Promise<ApiResponse<LoginResult>> {
    return { data: await this.authService.refresh(dto.refreshToken) };
  }

  /** Revokes this refresh row; access JWTs with that sid fail immediately. */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: LogoutDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: RequestAuthUser): Promise<ApiResponse<User>> {
    return { data: await this.authService.me(user.id) };
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async withdraw(@CurrentUser() user: RequestAuthUser, @Body() dto: WithdrawDto): Promise<void> {
    await this.authService.withdraw(user.id, dto);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  async google(@Body() dto: GoogleAuthDto): Promise<ApiResponse<GoogleAuthResult>> {
    return { data: await this.authService.google(dto.idToken) };
  }

  @Post('google/onboarding')
  @HttpCode(HttpStatus.OK)
  async googleOnboarding(@Body() dto: GoogleOnboardingDto): Promise<ApiResponse<LoginResult>> {
    return { data: await this.authService.googleOnboarding(dto) };
  }
}
