import type { UpdateUserPayload } from '@nest-vue/shared';
import { PartialType } from '@nestjs/mapped-types';

import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) implements UpdateUserPayload {}
