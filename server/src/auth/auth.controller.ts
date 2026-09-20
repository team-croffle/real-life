import type { GoogleAuthResult, LoginResult, RegisterResult, User } from '@nest-vue/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import type { IssuedLogin, RequestAuthUser } from './auth.types';
import { CurrentUser } from './current-user.decorator';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { GoogleOnboardingDto } from './dto/google-onboarding.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { attachRefreshCookie, clearRefreshCookie, readRefreshCookie } from './refresh-cookie';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private cookieSecure(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  private loginBody(res: Response, issued: IssuedLogin): LoginResult {
    attachRefreshCookie(res, issued.refreshToken, this.cookieSecure());
    return { accessToken: issued.accessToken, user: issued.user };
  }

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<RegisterResult> {
    return this.authService.register(dto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResult> {
    return this.loginBody(res, await this.authService.verifyEmail(dto.token));
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendVerification(@Body() dto: ResendVerificationDto): Promise<void> {
    await this.authService.resendVerification(dto.email);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResult> {
    return this.loginBody(res, await this.authService.login(dto));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResult> {
    const token = readRefreshCookie(req);
    if (!token) {
      throw new UnauthorizedException();
    }
    return this.loginBody(res, await this.authService.refresh(token));
  }

  /** Revokes this refresh row; access JWTs with that sid fail immediately. */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = readRefreshCookie(req);
    if (token) {
      try {
        await this.authService.logout(token);
      } catch {
        // 쿠키는 항상 지운다.
      }
    }
    clearRefreshCookie(res, this.cookieSecure());
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
  async google(
    @Body() dto: GoogleAuthDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<GoogleAuthResult> {
    const result = await this.authService.google(dto.idToken);
    if (result.needsOnboarding) {
      return result;
    }
    return { needsOnboarding: false, ...this.loginBody(res, result) };
  }

  @Post('google/onboarding')
  @HttpCode(HttpStatus.OK)
  async googleOnboarding(
    @Body() dto: GoogleOnboardingDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResult> {
    return this.loginBody(res, await this.authService.googleOnboarding(dto));
  }
}
