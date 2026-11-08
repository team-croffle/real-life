import type { MonsterStatus } from '@nest-vue/shared';

import type { AiTaskStatus } from '../database/schema/ai-tasks';

export function monsterView<Kind extends string>(
  monster: { kind: string; name: string; description: string } | undefined,
  taskStatus: AiTaskStatus | undefined,
  acceptKind: (kind: string) => kind is Kind,
  imageKeyFor: (kind: Kind) => string,
): {
  monsterStatus: MonsterStatus | null;
  monster: { kind: Kind; imageKey: string; name: string; description: string } | null;
} {
  if (monster && acceptKind(monster.kind)) {
    const name = monster.name.trim();
    const description = monster.description.trim();
    if (name && description) {
      return {
        monsterStatus: 'ready',
        monster: {
          kind: monster.kind,
          imageKey: imageKeyFor(monster.kind),
          name,
          description,
        },
      };
    }
  }
  if (taskStatus === 'pending' || taskStatus === 'running') {
    return { monsterStatus: 'generating', monster: null };
  }
  if (taskStatus === 'failed' || taskStatus === 'succeeded') {
    return { monsterStatus: 'failed', monster: null };
  }
  return { monsterStatus: null, monster: null };
}
