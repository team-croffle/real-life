import type { GoogleAuthResult, LoginResult, RegisterResult, User } from '@nest-vue/shared';
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
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<RegisterResult> {
    return this.authService.register(dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<LoginResult> {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendVerification(@Body() dto: ResendVerificationDto): Promise<void> {
    await this.authService.resendVerification(dto.email);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto): Promise<LoginResult> {
    return this.authService.refresh(dto.refreshToken);
  }

  /** Revokes this refresh row; access JWTs with that sid fail immediately. */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: LogoutDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: RequestAuthUser): Promise<User> {
    return this.authService.me(user.id);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async withdraw(@CurrentUser() user: RequestAuthUser, @Body() dto: WithdrawDto): Promise<void> {
    await this.authService.withdraw(user.id, dto);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  google(@Body() dto: GoogleAuthDto): Promise<GoogleAuthResult> {
    return this.authService.google(dto.idToken);
  }

  @Post('google/onboarding')
  @HttpCode(HttpStatus.OK)
  googleOnboarding(@Body() dto: GoogleOnboardingDto): Promise<LoginResult> {
    return this.authService.googleOnboarding(dto);
  }
}
