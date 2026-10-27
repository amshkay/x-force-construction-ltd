/**
 * Common Result, Pagination, and Error Types
 */

export interface SuccessResult<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResult {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type Result<T> = SuccessResult<T> | ErrorResult;

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface FilterOption {
  label: string;
  value: string | number | boolean;
}
