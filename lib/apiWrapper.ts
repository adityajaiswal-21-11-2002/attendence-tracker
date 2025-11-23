/**
 * API route wrapper with rate limiting, error handling, and security
 */

import { NextRequest, NextResponse } from "next/server"
import { rateLimitMiddleware, getClientIdentifier } from "./rateLimit"
import { sanitizeString } from "./security"

export interface ApiHandlerOptions {
  requireAuth?: boolean
  allowedRoles?: string[]
  rateLimit?: {
    windowMs: number
    maxRequests: number
  }
}

/**
 * Wrapper for API route handlers with built-in security and error handling
 */
export function createApiHandler(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  options: ApiHandlerOptions = {}
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      // Rate limiting
      if (options.rateLimit) {
        const rateLimitResult = await rateLimitMiddleware(req, options.rateLimit)
        if (rateLimitResult && !rateLimitResult.allowed) {
          return NextResponse.json(
            {
              error: "Too many requests",
              message: "Rate limit exceeded. Please try again later.",
            },
            {
              status: 429,
              headers: {
                "Retry-After": String(
                  Math.ceil(
                    (rateLimitResult.resetTime - Date.now()) / 1000
                  )
                ),
                "X-RateLimit-Limit": String(options.rateLimit.maxRequests),
                "X-RateLimit-Remaining": String(rateLimitResult.remaining),
                "X-RateLimit-Reset": String(rateLimitResult.resetTime),
              },
            }
          )
        }
      }

      // Execute handler
      return await handler(req, context)
    } catch (error: any) {
      // Log error
      console.error("API Error:", {
        path: req.url,
        method: req.method,
        error: error.message,
        stack: error.stack,
        clientId: getClientIdentifier(req),
      })

      // Return error response
      return NextResponse.json(
        {
          error: "Internal server error",
          message:
            process.env.NODE_ENV === "development"
              ? error.message
              : "An error occurred while processing your request",
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Validate and sanitize request body
 */
export function sanitizeRequestBody(body: any): any {
  if (typeof body === "string") {
    return sanitizeString(body)
  }

  if (Array.isArray(body)) {
    return body.map(sanitizeRequestBody)
  }

  if (body && typeof body === "object") {
    const sanitized: any = {}
    for (const key in body) {
      if (typeof body[key] === "string") {
        sanitized[key] = sanitizeString(body[key])
      } else if (typeof body[key] === "object") {
        sanitized[key] = sanitizeRequestBody(body[key])
      } else {
        sanitized[key] = body[key]
      }
    }
    return sanitized
  }

  return body
}

