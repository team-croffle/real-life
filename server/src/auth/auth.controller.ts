import type { RegisterResult, User } from '@nest-vue/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';

import { AllowWithoutJob } from './allow-without-job';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { ProfileService } from './profile.service';

@Controller('account')
export class AuthController {
  constructor(private readonly profiles: ProfileService) {}

  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request): Promise<RegisterResult> {
    return this.profiles.register(dto, req.ip);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendVerification(@Body() dto: ResendVerificationDto, @Req() req: Request): Promise<void> {
    await this.profiles.resendVerification(dto.email, req.ip);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Session() session: UserSession): Promise<User> {
    return this.profiles.me(session.user.id);
  }

  @Post('onboarding')
  @AllowWithoutJob()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  completeOnboarding(
    @Session() session: UserSession,
    @Body() dto: CompleteOnboardingDto,
  ): Promise<User> {
    return this.profiles.completeOnboarding(session.user.id, dto);
  }

  @Delete('me')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async withdraw(@Session() session: UserSession, @Body() dto: WithdrawDto): Promise<void> {
    await this.profiles.withdraw(session, dto);
  }
}
