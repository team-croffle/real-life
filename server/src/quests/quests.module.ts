import { Module } from '@nestjs/common';

import { WalletModule } from '../wallet/wallet.module';
import { QuestCompletionService } from './quest-completion.service';
import { QuestPenaltiesController } from './quest-penalties.controller';
import { QuestPenaltyService } from './quest-penalty.service';
import { QuestSettlementScheduler } from './quest-settlement.scheduler';
import { QuestsController } from './quests.controller';
import { QuestsService } from './quests.service';

@Module({
  imports: [WalletModule],
  controllers: [QuestsController, QuestPenaltiesController],
  providers: [QuestsService, QuestCompletionService, QuestPenaltyService, QuestSettlementScheduler],
})
export class QuestsModule {}
