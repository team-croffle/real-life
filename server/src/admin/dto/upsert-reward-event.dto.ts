import type { UpsertRewardEventPayload } from '@nest-vue/shared';
import { EVENT_MULTIPLIER_MAX, EVENT_MULTIPLIER_MIN } from '@nest-vue/shared';
import { IsISO8601, IsNumber, Max, Min } from 'class-validator';

export class UpsertRewardEventDto implements UpsertRewardEventPayload {
  @IsNumber()
  @Min(EVENT_MULTIPLIER_MIN)
  @Max(EVENT_MULTIPLIER_MAX)
  multiplier!: number;

  @IsISO8601()
  startsAt!: string;

  @IsISO8601()
  endsAt!: string;
}
