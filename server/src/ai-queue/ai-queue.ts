import type { MonsterDescription } from '../ai/ai';
import type { AiTaskStatus } from '../database/schema/ai-tasks';

export const AI_QUEUE = Symbol('AI_QUEUE');

export const AI_TASKS_PER_MINUTE_DEFAULT = 12;

/** 이 시간을 넘긴 running은 끊긴 것으로 본다. */
export const AI_STALE_RUNNING_MS_DEFAULT = 60_000;

export type MonsterTaskPayload = {
  title: string;
  kinds: string[];
};

/** 목록이 읽는 큐 행. 상태 변환은 호출부가 한다. */
export type MonsterTaskState = {
  questId: string;
  status: AiTaskStatus;
  result: unknown;
};

export type ClaimedAiTask = {
  id: string;
  userId: string;
  /** 이번 집기에서 올린 시도 횟수. 완료와 실패는 이 값과 같을 때만 행을 고친다. */
  attempts: number;
  payload: unknown;
};

export interface AiQueue {
  /** questId는 열에만 저장한다. payload에는 넣지 않는다. */
  enqueue(input: { userId: string; questId: string; payload: MonsterTaskPayload }): Promise<{
    id: string;
  }>;
  /** 작업이 없는 퀘스트는 빠진다. */
  findMonsters(questIds: string[]): Promise<MonsterTaskState[]>;
  dequeue(): Promise<ClaimedAiTask | null>;
  complete(id: string, attempts: number, result: MonsterDescription): Promise<void>;
  fail(id: string, attempts: number, reason: string, rateLimited: boolean): Promise<void>;
}
