import type { ShopKind, UpdateUserRewardPayload } from '@nest-vue/shared';
import {
  QUEST_TITLE_MAX,
  SHOP_KINDS,
  USER_REWARD_PRICE_MAX,
  USER_REWARD_PRICE_MIN,
} from '@nest-vue/shared';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateUserRewardDto implements UpdateUserRewardPayload {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(QUEST_TITLE_MAX)
  name?: string;

  @IsOptional()
  @IsIn(SHOP_KINDS)
  kind?: ShopKind;

  @IsOptional()
  @IsInt()
  @Min(USER_REWARD_PRICE_MIN)
  @Max(USER_REWARD_PRICE_MAX)
  price?: number;
}
