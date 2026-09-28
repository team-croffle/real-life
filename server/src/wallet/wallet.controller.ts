import type { Paginated, WalletBalance, WalletEntry } from '@nest-vue/shared';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';

import { CreatePostHocDeductionDto } from './dto/create-post-hoc-deduction.dto';
import { ListWalletEntriesQueryDto } from './dto/list-wallet-entries-query.dto';
import { WalletService } from './wallet.service';

@Controller('wallet')
@UseGuards(AuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  getBalance(@Session() session: UserSession): Promise<WalletBalance> {
    return this.walletService.getBalance(session.user.id);
  }

  @Get('entries')
  listEntries(
    @Session() session: UserSession,
    @Query() query: ListWalletEntriesQueryDto,
  ): Promise<Paginated<WalletEntry>> {
    return this.walletService.listEntries(session.user.id, query);
  }

  @Post('post-hoc-deductions')
  createPostHocDeduction(
    @Session() session: UserSession,
    @Body() dto: CreatePostHocDeductionDto,
  ): Promise<WalletBalance> {
    return this.walletService.createPostHocDeduction(session.user.id, dto);
  }
}
