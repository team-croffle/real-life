import type { CreateUserRewardPayload, ShopKind } from '@nest-vue/shared';
import {
  QUEST_TITLE_MAX,
  SHOP_KINDS,
  USER_REWARD_PRICE_MAX,
  USER_REWARD_PRICE_MIN,
} from '@nest-vue/shared';
import { IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateUserRewardDto implements CreateUserRewardPayload {
  @IsString()
  @MinLength(1)
  @MaxLength(QUEST_TITLE_MAX)
  name!: string;

  @IsIn(SHOP_KINDS)
  kind!: ShopKind;

  @IsInt()
  @Min(USER_REWARD_PRICE_MIN)
  @Max(USER_REWARD_PRICE_MAX)
  price!: number;
}
