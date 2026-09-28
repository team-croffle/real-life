import { IsInt, Min } from 'class-validator';

export class CreatePostHocDeductionDto {
  @IsInt()
  @Min(1)
  amount!: number;
}
