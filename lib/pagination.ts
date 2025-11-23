/**
 * Pagination utilities for API routes
 */

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * Parse pagination parameters from request
 */
export function parsePaginationParams(
  searchParams: URLSearchParams
): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") || "10", 10))
  )
  const sortBy = searchParams.get("sortBy") || "createdAt"
  const sortOrder =
    (searchParams.get("sortOrder") as "asc" | "desc") || "desc"

  return { page, limit, sortBy, sortOrder }
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const { page = 1, limit = 10 } = params
  const totalPages = Math.ceil(total / limit)

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }
}

/**
 * Get skip value for MongoDB queries
 */
export function getSkipValue(page: number, limit: number): number {
  return (page - 1) * limit
}

