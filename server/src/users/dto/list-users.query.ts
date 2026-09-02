import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, type PaginationQuery } from '@nest-vue/shared';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListUsersQuery implements PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  size: number = DEFAULT_PAGE_SIZE;
}
