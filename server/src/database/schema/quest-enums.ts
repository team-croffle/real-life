import {
  QUEST_CATEGORIES,
  QUEST_DIFFICULTIES,
  QUEST_PACES,
  QUEST_WEEKDAYS,
} from '@nest-vue/shared';
import { pgEnum } from 'drizzle-orm/pg-core';

export const questPaceEnum = pgEnum('quest_pace', QUEST_PACES);
export const questCategoryEnum = pgEnum('quest_category', QUEST_CATEGORIES);
export const questDifficultyEnum = pgEnum('quest_difficulty', QUEST_DIFFICULTIES);
export const questWeekdayEnum = pgEnum('quest_weekday', QUEST_WEEKDAYS);
