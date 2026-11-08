import type { Routine } from '@nest-vue/shared';
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

import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { RoutinesService } from './routines.service';

@Controller('routines')
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Get()
  @UseGuards(AuthGuard)
  list(@Session() session: UserSession): Promise<Routine[]> {
    return this.routinesService.list(session.user.id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Session() session: UserSession, @Body() dto: CreateRoutineDto): Promise<Routine> {
    return this.routinesService.create(session.user.id, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Session() session: UserSession,
    @Param('id') routineId: string,
    @Body() dto: UpdateRoutineDto,
  ): Promise<Routine> {
    return this.routinesService.update(session.user.id, routineId, dto);
  }

  @Post(':id/pause')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  pause(@Session() session: UserSession, @Param('id') routineId: string): Promise<Routine> {
    return this.routinesService.pause(session.user.id, routineId);
  }

  @Post(':id/resume')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  resume(@Session() session: UserSession, @Param('id') routineId: string): Promise<Routine> {
    return this.routinesService.resume(session.user.id, routineId);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  remove(@Session() session: UserSession, @Param('id') routineId: string): Promise<void> {
    return this.routinesService.remove(session.user.id, routineId);
  }
}
