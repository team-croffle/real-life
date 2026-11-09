import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export const HISTORY_PAGE_SIZES = [5, 10, 15, 20] as const;
export const HISTORY_DEFAULT_PAGE_SIZE = 20;

export class ListHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(HISTORY_PAGE_SIZES)
  size?: number;
}
