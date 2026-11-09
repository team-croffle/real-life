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

/** 큐에 넣는 주인. 셋 중 하나만 있다. */
export type MonsterTaskOwner =
  | { questId: string; routineId?: undefined; bossId?: undefined }
  | { routineId: string; questId?: undefined; bossId?: undefined }
  | { bossId: string; questId?: undefined; routineId?: undefined };

/** 목록이 읽는 큐 행. 성공한 작업은 행이 없다. */
export type MonsterTaskState = {
  questId: string | null;
  routineId: string | null;
  bossId: string | null;
  status: AiTaskStatus;
};

export type ClaimedAiTask = {
  id: string;
  userId: string;
  /** 이번 집기에서 올린 시도 횟수. 완료와 실패는 이 값과 같을 때만 행을 고친다. */
  attempts: number;
  payload: unknown;
  bossId: string | null;
};

export interface AiQueue {
  /** 주인 id는 열에만 저장한다. payload에는 넣지 않는다. */
  enqueue(input: {
    userId: string;
    owner: MonsterTaskOwner;
    payload: MonsterTaskPayload;
  }): Promise<{ id: string }>;
  /** 넘긴 id 가운데 작업이 있는 것만 돌려준다. */
  findTasks(input: {
    questIds?: string[];
    routineIds?: string[];
    bossIds?: string[];
  }): Promise<MonsterTaskState[]>;
  dequeue(): Promise<ClaimedAiTask | null>;
  /**
   * failed 행만 pending으로 되돌린다. 시도 횟수는 0이다.
   * 행이 없거나 failed가 아니면 false다.
   */
  requeueFailed(owner: MonsterTaskOwner): Promise<boolean>;
  /** 몬스터 행을 넣고 주인에 연결한 뒤 큐에서 지운다. */
  complete(id: string, attempts: number, result: MonsterDescription): Promise<void>;
  fail(id: string, attempts: number, reason: string, rateLimited: boolean): Promise<void>;
}
