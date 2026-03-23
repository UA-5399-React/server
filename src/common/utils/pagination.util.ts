import { PaginatedResult } from '@/common/types/paginated-result.type';

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export function getPagination(page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
