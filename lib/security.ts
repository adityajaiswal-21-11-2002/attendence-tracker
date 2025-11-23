/**
 * Security utilities for input sanitization and validation
 */

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    return ""
  }

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .slice(0, 10000) // Limit length
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== "string") {
    return ""
  }

  return email.trim().toLowerCase().slice(0, 255)
}

/**
 * Sanitize phone number
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== "string") {
    return ""
  }

  // Remove all non-digit characters except + at the start
  return phone.replace(/[^\d+]/g, "").slice(0, 20)
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }

  for (const key in sanitized) {
    if (typeof sanitized[key] === "string") {
      sanitized[key] = sanitizeString(sanitized[key]) as any
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      if (Array.isArray(sanitized[key])) {
        sanitized[key] = sanitized[key].map((item: any) =>
          typeof item === "string" ? sanitizeString(item) : item
        ) as any
      } else {
        sanitized[key] = sanitizeObject(sanitized[key]) as any
      }
    }
  }

  return sanitized
}

/**
 * Validate and sanitize MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id)
}

/**
 * Escape HTML entities
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }

  return text.replace(/[&<>"']/g, (m) => map[m])
}

