import { type CreateUserPayload, USER_ROLES, type UserRole } from '@nest-vue/shared';
import { IsEmail, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateUserDto implements CreateUserPayload {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(1, 60)
  name!: string;

  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;
}
