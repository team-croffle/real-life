import type { ShopItem, WalletBalance } from '@nest-vue/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, Session } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';

import { CreateShopPurchaseDto } from './dto/create-shop-purchase.dto';
import { CreateUserRewardDto } from './dto/create-user-reward.dto';
import { UpdateUserRewardDto } from './dto/update-user-reward.dto';
import { ShopService } from './shop.service';

@Controller('shop')
@UseGuards(AuthGuard)
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get()
  list(@Session() session: UserSession): Promise<ShopItem[]> {
    return this.shopService.list(session.user.id);
  }

  @Post('rewards')
  create(@Session() session: UserSession, @Body() dto: CreateUserRewardDto): Promise<ShopItem> {
    return this.shopService.create(session.user.id, dto);
  }

  @Patch('rewards/:id')
  update(
    @Session() session: UserSession,
    @Param('id') rewardId: string,
    @Body() dto: UpdateUserRewardDto,
  ): Promise<ShopItem> {
    return this.shopService.update(session.user.id, rewardId, dto);
  }

  @Delete('rewards/:id')
  @HttpCode(204)
  remove(@Session() session: UserSession, @Param('id') rewardId: string): Promise<void> {
    return this.shopService.remove(session.user.id, rewardId);
  }

  @Post('purchases')
  @HttpCode(200)
  purchase(
    @Session() session: UserSession,
    @Body() dto: CreateShopPurchaseDto,
  ): Promise<WalletBalance> {
    return this.shopService.purchase(session.user.id, dto.id);
  }
}
