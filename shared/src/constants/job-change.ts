export const JOB_CHANGE_COOLDOWN_DAYS = 30;

export const JOB_CHANGE_REASONS = ['none', 'employment', 'unemployment'] as const;

export type JobChangeReason = (typeof JOB_CHANGE_REASONS)[number];

/** 지급이 장부에 남는지 확인하는 임시 값이다. 확정 금액이 아니다. */
export const JOB_CHANGE_EMPLOYMENT_GOLD = 50;
