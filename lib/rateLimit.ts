/**
 * Simple in-memory rate limiting for API routes
 * Works well for single server deployments
 */

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
}

const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
}

/**
 * Clean up expired entries (run periodically)
 */
function cleanup() {
  const now = Date.now()
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanup, 5 * 60 * 1000)
}

/**
 * Check if request should be rate limited
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = defaultConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const key = identifier

  // Cleanup expired entries
  if (store[key] && store[key].resetTime < now) {
    delete store[key]
  }

  // Initialize or get existing entry
  if (!store[key]) {
    store[key] = {
      count: 0,
      resetTime: now + config.windowMs,
    }
  }

  // Increment count
  store[key].count++

  // Check if limit exceeded
  const allowed = store[key].count <= config.maxRequests
  const remaining = Math.max(0, config.maxRequests - store[key].count)

  return {
    allowed,
    remaining,
    resetTime: store[key].resetTime,
  }
}

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from headers (for Vercel, Netlify, etc.)
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const ip = forwarded?.split(",")[0] || realIp || "unknown"

  return ip
}

/**
 * Rate limit middleware for API routes
 */
export async function rateLimitMiddleware(
  request: Request,
  config?: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetTime: number } | null> {
  const identifier = getClientIdentifier(request)
  return checkRateLimit(identifier, config)
}

