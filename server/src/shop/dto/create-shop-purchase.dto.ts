import type { CreateShopPurchasePayload } from '@nest-vue/shared';
import { IsString, MinLength } from 'class-validator';

export class CreateShopPurchaseDto implements CreateShopPurchasePayload {
  @IsString()
  @MinLength(1)
  id!: string;
}
