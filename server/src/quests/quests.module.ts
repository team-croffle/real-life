import { Module } from '@nestjs/common';

import { WalletModule } from '../wallet/wallet.module';
import { QuestCompletionService } from './quest-completion.service';
import { QuestsController } from './quests.controller';
import { QuestsService } from './quests.service';

@Module({
  imports: [WalletModule],
  controllers: [QuestsController],
  providers: [QuestsService, QuestCompletionService],
})
export class QuestsModule {}
