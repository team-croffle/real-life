/** 페이지네이션 요청 파라미터 */
export interface PaginationQuery {
  page?: number;
  size?: number;
}

/** 페이지네이션 응답 */
export interface Paginated<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

/** 표준 에러 응답 */
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  path?: string;
  timestamp?: string;
}
