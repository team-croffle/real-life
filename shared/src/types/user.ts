export const USER_ROLES = ['admin', 'member'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

/** 사용자 생성 페이로드 (server DTO / web form 공용) */
export interface CreateUserPayload {
  email: string;
  name: string;
  role?: UserRole;
}

export type UpdateUserPayload = Partial<CreateUserPayload>;
