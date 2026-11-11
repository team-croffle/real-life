import { Module } from '@nestjs/common';

import { AdminModule } from '../admin/admin.module';
import { AiQueueModule } from '../ai-queue/ai-queue.module';
import { AiModule } from '../ai/ai.module';
import { WalletModule } from '../wallet/wallet.module';
import { BossJudgmentService } from './boss-judgment.service';
import { BossPlanService } from './boss-plan.service';
import { BossesController } from './bosses.controller';
import { MonsterRetryService } from './monster-retry.service';
import { QuestCompletionService } from './quest-completion.service';
import { QuestCritRoller } from './quest-crit.roller';
import { QuestPenaltiesController } from './quest-penalties.controller';
import { QuestPenaltyService } from './quest-penalty.service';
import { QuestSettlementScheduler } from './quest-settlement.scheduler';
import { QuestsController } from './quests.controller';
import { QuestsService } from './quests.service';
import { RoutineSpawnService } from './routine-spawn.service';
import { RoutinesController } from './routines.controller';
import { RoutinesService } from './routines.service';

@Module({
  imports: [AiModule, AiQueueModule, WalletModule, AdminModule],
  controllers: [QuestsController, QuestPenaltiesController, BossesController, RoutinesController],
  providers: [
    QuestsService,
    BossPlanService,
    BossJudgmentService,
    QuestCompletionService,
    QuestCritRoller,
    QuestPenaltyService,
    QuestSettlementScheduler,
    RoutineSpawnService,
    RoutinesService,
    MonsterRetryService,
  ],
})
export class QuestsModule {}
