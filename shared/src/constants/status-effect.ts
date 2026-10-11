export const STATUS_EFFECTS = ['lethargy'] as const;

export type StatusEffect = (typeof STATUS_EFFECTS)[number];
