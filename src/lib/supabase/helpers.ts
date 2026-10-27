import { PostgrestError } from '@supabase/supabase-js';
import { Result, SuccessResult, ErrorResult, PaginatedResponse, PaginationParams } from '../../types/common';
import { normalizeError } from '../../utils/errorHandler';

/**
 * Normalizes Supabase API responses into a predictable Result<T> pattern
 */
export function handleSupabaseResponse<T>(
  data: T | null,
  error: PostgrestError | Error | null
): Result<T> {
  if (error) {
    const normalized = normalizeError(error);
    const errorResult: ErrorResult = {
      success: false,
      error: {
        code: normalized.code,
        message: normalized.userMessage,
        details: error,
      },
    };
    return errorResult;
  }

  const successResult: SuccessResult<T> = {
    success: true,
    data: data as T,
  };
  return successResult;
}

/**
 * Calculates zero-based range indices for Supabase `.range(from, to)`
 */
export function calculateRange(page = 1, pageSize = 20): { from: number; to: number } {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, 100)); // Cap max page size to 100
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;
  return { from, to };
}

/**
 * Wraps paginated Supabase array responses into standard PaginatedResponse<T>
 */
export function buildPaginatedResponse<T>(
  items: T[],
  totalCount: number | null,
  params?: PaginationParams
): PaginatedResponse<T> {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const total = totalCount ?? items.length;
  const totalPages = Math.ceil(total / pageSize);

  return {
    items,
    page,
    pageSize,
    total,
    totalPages,
    hasMore: page < totalPages,
  };
}
