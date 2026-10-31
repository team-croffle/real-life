import type { MonsterDescription } from '../ai/ai';

export const AI_QUEUE = Symbol('AI_QUEUE');

export const AI_TASKS_PER_MINUTE_DEFAULT = 12;

export type MonsterTaskPayload = {
  title: string;
  kinds: string[];
};

export type ClaimedAiTask = {
  id: string;
  userId: string;
  payload: unknown;
};

export interface AiQueue {
  enqueue(input: { userId: string; payload: MonsterTaskPayload }): Promise<{ id: string }>;
  dequeue(): Promise<ClaimedAiTask | null>;
  complete(id: string, result: MonsterDescription): Promise<void>;
  fail(id: string, reason: string, rateLimited: boolean): Promise<void>;
}
