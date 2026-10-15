/**
 * Pagination helpers for server-side paginated endpoints.
 * Supports cursor-based or offset-based pagination depending on the use case.
 * The trip list endpoint (tens of thousands of records) needs this.
 */

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Parse pagination params from query string with safe defaults.
 * Caps pageSize at 100 to prevent abuse.
 */
export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, Number(query.page) || 1);
  const rawSize = Number(query.pageSize) || 20;
  const pageSize = Math.min(100, Math.max(1, rawSize));
  const sortBy = typeof query.sortBy === 'string' ? query.sortBy : undefined;
  const sortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';

  return { page, pageSize, sortBy, sortOrder };
}

/**
 * Build Prisma-compatible skip/take from pagination params.
 */
export function toPrismaPage(params: PaginationParams): { skip: number; take: number } {
  return {
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
  };
}

/**
 * Build paginated response.
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResult<T> {
  return {
    data,
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.ceil(total / params.pageSize),
    },
  };
}
