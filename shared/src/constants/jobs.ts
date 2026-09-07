export const JOB_CLASSES = ['student', 'office_worker', 'freelancer'] as const;

export type JobClass = (typeof JOB_CLASSES)[number];

export const JOB_CLASS_LABELS: Record<JobClass, string> = {
  student: '학생',
  office_worker: '직장인',
  freelancer: '프리랜서',
};

/** 퀘스트 완료 보상 배율. 적용은 feat/quest-complete-server */
export const JOB_CLASS_REWARD_MULTIPLIERS: Record<
  JobClass,
  { intellect?: number; stamina?: number; sense?: number }
> = {
  student: { intellect: 1.2 },
  office_worker: { intellect: 1.1, stamina: 1.1 },
  freelancer: { sense: 1.2 },
};
