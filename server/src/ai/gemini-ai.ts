import { ApiError, GoogleGenAI } from '@google/genai';
import {
  BOSS_SUBQUEST_MAX,
  QUEST_CATEGORIES,
  QUEST_CATEGORY_LABELS,
  QUEST_DIFFICULTIES,
  QUEST_NOTE_MAX_LENGTH,
  QUEST_PACES,
  QUEST_SCHEDULES,
  QUEST_TITLE_MAX,
  QUEST_WEEKDAYS,
  type QuestCategory,
  type QuestDifficulty,
  type QuestPace,
  type QuestSchedule,
  type QuestWeekday,
} from '@nest-vue/shared';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  AI_CALL_TIMEOUT_MS_DEFAULT,
  AiRateLimitError,
  GEMINI_MODEL_DEFAULT,
  type Ai,
  type BattleLogDraft,
  type DifficultyDraft,
  type DifficultyRecommendation,
  type MonsterDescription,
  type MonsterDraft,
  type QuestPlanDraft,
  type SuggestedQuest,
} from './ai';
import { DIFFICULTY_HISTORY_DAYS } from './difficulty.service';

const TEXT_MAX = 200;
const GEMINI_MIN_DEADLINE_MS = 10_000;

@Injectable()
export class GeminiAi implements Ai {
  constructor(private readonly config: ConfigService) {}

  async describeMonster(input: MonsterDraft): Promise<MonsterDescription> {
    return this.nameCreature(input, [
      '할 일을 몬스터로 바꿔라.',
      '종류는 목록 안에서만 고르고, 그 종류에 맞는 이름과 한 줄 설명을 한국어로 지어라.',
      '골드, 경험치, 보상 금액은 말하지 마라.',
    ]);
  }

  async describeBoss(input: MonsterDraft): Promise<MonsterDescription> {
    return this.nameCreature(input, [
      '목표를 보스로 바꿔라.',
      '이름은 무겁고 웅장하게 한국어로 지어라.',
      '설명은 같은 톤으로 한 줄만 써라.',
      '종류는 목록 안에서만 고르고, 그 종류에 맞게 지어라.',
      '골드, 경험치, 보상 금액은 말하지 마라.',
    ]);
  }

  private async nameCreature(
    input: MonsterDraft,
    instructions: readonly string[],
  ): Promise<MonsterDescription> {
    const title = oneLine(input.title, TEXT_MAX);
    const kinds = input.kinds.map((kind) => oneLine(kind, TEXT_MAX));
    if (kinds.length === 0) {
      throw new Error('monster kinds are empty');
    }

    const body = await this.generate(
      [...instructions, '', `문구: ${title}`, `종류 목록: ${kinds.join(', ')}`].join('\n'),
      {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'name', 'description'],
        properties: {
          kind: { type: 'string', enum: kinds },
          name: { type: 'string' },
          description: { type: 'string' },
        },
      },
    );
    if (!isRecord(body)) {
      throw new Error('monster response shape is invalid');
    }
    const kind = oneLine(body.kind, TEXT_MAX);
    if (!kinds.includes(kind)) {
      throw new Error('monster kind is not in the list');
    }
    return {
      kind,
      name: oneLine(body.name, TEXT_MAX),
      description: oneLine(body.description, TEXT_MAX),
    };
  }

  async writeBattleLog(input: BattleLogDraft, timeoutMs?: number): Promise<string> {
    const monsterName = oneLine(input.monsterName, TEXT_MAX);
    const note = noteText(input.note);
    const body = await this.generate(
      [
        '몬스터와 수행 메모를 보고 전투 기록을 한국어로 2줄 또는 3줄 써라.',
        '각 줄은 한 문장이다.',
        '골드, 경험치, 보상 금액은 말하지 마라.',
        '',
        `몬스터: ${monsterName}`,
        `메모: ${note}`,
      ].join('\n'),
      {
        type: 'object',
        additionalProperties: false,
        required: ['lines'],
        properties: {
          lines: {
            type: 'array',
            minItems: 2,
            maxItems: 3,
            items: { type: 'string' },
          },
        },
      },
      timeoutMs,
    );
    if (!isRecord(body) || !Array.isArray(body.lines)) {
      throw new Error('battle log response shape is invalid');
    }
    if (body.lines.length < 2 || body.lines.length > 3) {
      throw new Error('battle log must be 2 or 3 lines');
    }
    return body.lines.map((line) => oneLine(line, TEXT_MAX)).join('\n');
  }

  async recommendDifficulty(input: DifficultyDraft): Promise<DifficultyRecommendation> {
    const title = oneLine(input.title, TEXT_MAX);
    const body = await this.generate(
      [
        '할 일의 난이도를 easy, normal, hard 중 하나로 고르고, 이유를 한국어 한 줄로 써라.',
        `할 일이 얼마나 힘든지 먼저 보고, 이 사용자의 최근 ${DIFFICULTY_HISTORY_DAYS}일 기록에 맞게 조정해라. 많이 놓쳤으면 낮게, 잘 해냈으면 높게.`,
        '기록이 둘 다 0이면 할 일만 보고 골라라.',
        '금액은 정하지 마라.',
        '',
        `할 일: ${title}`,
        `카테고리: ${QUEST_CATEGORY_LABELS[input.category]}`,
        `최근 ${DIFFICULTY_HISTORY_DAYS}일 이 카테고리: 완료 ${input.completedCount}개, 놓침 ${input.missedCount}개`,
      ].join('\n'),
      {
        type: 'object',
        additionalProperties: false,
        required: ['difficulty', 'reason'],
        properties: {
          difficulty: { type: 'string', enum: [...QUEST_DIFFICULTIES] },
          reason: { type: 'string' },
        },
      },
    );
    if (!isRecord(body) || !isQuestDifficulty(body.difficulty)) {
      throw new Error('difficulty response shape is invalid');
    }
    return { difficulty: body.difficulty, reason: oneLine(body.reason, TEXT_MAX) };
  }

  async suggestPlan(input: QuestPlanDraft): Promise<SuggestedQuest[]> {
    const goal = oneLine(input.goal, QUEST_TITLE_MAX);
    if (!isSeoulDate(input.deadlineOn)) {
      throw new Error('deadline is not a calendar date');
    }
    if (!isSeoulDate(input.today)) {
      throw new Error('today is not a calendar date');
    }
    const body = await this.generate(
      [
        '큰 목표를 마감일까지의 하위 퀘스트로 나눠라.',
        '필요한 만큼만, 보통 3~7개.',
        '각 항목의 schedule은 routine 또는 deadline이다.',
        'category는 exercise, life, study, work, creation, mind 중 하나다.',
        'deadline이면 pace는 steady 또는 once이고, endsOn은 오늘 이상 마감일 이하의 YYYY-MM-DD다. weekdays와 biweekly는 null이다.',
        'routine이면 pace와 endsOn은 null이다. weekdays는 mon, tue, wed, thu, fri, sat, sun 중 하나 이상이고, biweekly는 true 또는 false다.',
        '횟수, 체력, 골드, 경험치, 보상 금액은 말하지 마라.',
        '제목은 한국어로 써라.',
        '',
        `목표: ${goal}`,
        `오늘: ${input.today}`,
        `마감: ${input.deadlineOn}`,
      ].join('\n'),
      {
        type: 'object',
        additionalProperties: false,
        required: ['quests'],
        properties: {
          quests: {
            type: 'array',
            maxItems: BOSS_SUBQUEST_MAX,
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'title',
                'category',
                'schedule',
                'difficulty',
                'pace',
                'endsOn',
                'weekdays',
                'biweekly',
              ],
              properties: {
                title: { type: 'string' },
                category: { type: 'string', enum: [...QUEST_CATEGORIES] },
                schedule: { type: 'string', enum: [...QUEST_SCHEDULES] },
                difficulty: { type: 'string', enum: [...QUEST_DIFFICULTIES] },
                pace: { type: ['string', 'null'], enum: [...QUEST_PACES, null] },
                endsOn: { type: ['string', 'null'] },
                weekdays: {
                  type: ['array', 'null'],
                  items: { type: 'string', enum: [...QUEST_WEEKDAYS] },
                },
                biweekly: { type: ['boolean', 'null'] },
              },
            },
          },
        },
      },
    );
    if (!isRecord(body) || !Array.isArray(body.quests)) {
      throw new Error('plan response shape is invalid');
    }
    if (body.quests.length > BOSS_SUBQUEST_MAX) {
      throw new Error('plan has too many quests');
    }
    return body.quests.map((quest) => suggestedQuest(quest));
  }

  private async generate(
    prompt: string,
    schema: Record<string, unknown>,
    timeoutMs = this.callTimeoutMs(),
  ): Promise<unknown> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    const model = this.config.get<string>('GEMINI_MODEL')?.trim() || GEMINI_MODEL_DEFAULT;
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const response = await new GoogleGenAI({ apiKey }).models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: schema,
          abortSignal: controller.signal,
          // SDK 재시도는 1회로 둔다. 다시 넣기는 큐가 한다.
          httpOptions: {
            timeout: Math.max(GEMINI_MIN_DEADLINE_MS, this.callTimeoutMs()),
            retryOptions: { attempts: 1 },
          },
        },
      });
      if (!response.text) {
        throw new Error('Gemini response was empty');
      }
      return parseJson(response.text);
    } catch (error) {
      if (timedOut) {
        throw new Error('Gemini call timed out', { cause: error });
      }
      if (error instanceof AiRateLimitError) {
        throw error;
      }
      if (error instanceof ApiError && error.status === 429) {
        throw new AiRateLimitError(error.message);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private callTimeoutMs(): number {
    const raw = this.config.get<string | number>('AI_CALL_TIMEOUT_MS', AI_CALL_TIMEOUT_MS_DEFAULT);
    const parsed = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return AI_CALL_TIMEOUT_MS_DEFAULT;
    }
    return parsed;
  }
}

function parseJson(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  return JSON.parse(trimmed) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function noteText(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('expected text');
  }
  const line = value.replace(/\s+/g, ' ').trim();
  if (!line || line.length > QUEST_NOTE_MAX_LENGTH) {
    throw new Error('text length is out of range');
  }
  return line;
}

function oneLine(value: unknown, max: number): string {
  if (typeof value !== 'string') {
    throw new Error('expected text');
  }
  const line = value.replace(/\s+/g, ' ').trim();
  if (!line || line.length > max) {
    throw new Error('text length is out of range');
  }
  return line;
}

function isQuestCategory(value: unknown): value is QuestCategory {
  return QUEST_CATEGORIES.some((category) => category === value);
}

function isQuestDifficulty(value: unknown): value is QuestDifficulty {
  return QUEST_DIFFICULTIES.some((difficulty) => difficulty === value);
}

function isQuestSchedule(value: unknown): value is QuestSchedule {
  return QUEST_SCHEDULES.some((schedule) => schedule === value);
}

function isQuestPace(value: unknown): value is QuestPace {
  return QUEST_PACES.some((pace) => pace === value);
}

function isQuestWeekday(value: unknown): value is QuestWeekday {
  return QUEST_WEEKDAYS.some((weekday) => weekday === value);
}

function routineWeekdays(value: unknown): QuestWeekday[] | null {
  if (!Array.isArray(value) || value.length < 1) {
    return null;
  }
  if (!value.every(isQuestWeekday)) {
    return null;
  }
  const selected = new Set(value);
  if (selected.size !== value.length) {
    return null;
  }
  return QUEST_WEEKDAYS.filter((weekday) => selected.has(weekday));
}

function isSeoulDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function suggestedQuest(value: unknown): SuggestedQuest {
  if (
    !isRecord(value) ||
    !isQuestCategory(value.category) ||
    !isQuestSchedule(value.schedule) ||
    !isQuestDifficulty(value.difficulty)
  ) {
    throw new Error('suggested quest shape is invalid');
  }
  const title = oneLine(value.title, QUEST_TITLE_MAX);

  if (value.schedule === 'routine') {
    const weekdays = routineWeekdays(value.weekdays);
    if (value.pace !== null || value.endsOn !== null || weekdays === null) {
      throw new Error('a routine quest needs weekdays and no deadline');
    }
    if (typeof value.biweekly !== 'boolean') {
      throw new Error('a routine quest needs biweekly');
    }
    return {
      title,
      category: value.category,
      schedule: 'routine',
      difficulty: value.difficulty,
      pace: null,
      endsOn: null,
      weekdays,
      biweekly: value.biweekly,
    };
  }

  if (
    !isQuestPace(value.pace) ||
    typeof value.endsOn !== 'string' ||
    !isSeoulDate(value.endsOn) ||
    value.weekdays !== null ||
    value.biweekly !== null
  ) {
    throw new Error('a deadline quest needs a pace and a date');
  }
  return {
    title,
    category: value.category,
    schedule: 'deadline',
    difficulty: value.difficulty,
    pace: value.pace,
    endsOn: value.endsOn,
    weekdays: null,
    biweekly: null,
  };
}
