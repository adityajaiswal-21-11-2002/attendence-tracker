/**
 * Error logging utility
 * For production, integrate with Sentry or similar service
 */

export interface ErrorLog {
  message: string
  stack?: string
  context?: Record<string, any>
  severity?: "low" | "medium" | "high" | "critical"
  timestamp: Date
  userId?: string
  path?: string
  method?: string
}

class ErrorLogger {
  private logs: ErrorLog[] = []
  private maxLogs = 1000

  /**
   * Log an error
   */
  log(error: Error | string, context?: Record<string, any>): void {
    const errorLog: ErrorLog = {
      message: typeof error === "string" ? error : error.message,
      stack: typeof error === "object" ? error.stack : undefined,
      context,
      severity: "medium",
      timestamp: new Date(),
    }

    // Add to in-memory logs
    this.logs.push(errorLog)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // Console log for development
    if (process.env.NODE_ENV === "development") {
      console.error("Error Logged:", errorLog)
    }

    // In production, send to error tracking service
    if (process.env.NODE_ENV === "production") {
      this.sendToTrackingService(errorLog)
    }
  }

  /**
   * Log critical error
   */
  logCritical(error: Error | string, context?: Record<string, any>): void {
    const errorLog: ErrorLog = {
      message: typeof error === "string" ? error : error.message,
      stack: typeof error === "object" ? error.stack : undefined,
      context,
      severity: "critical",
      timestamp: new Date(),
    }

    this.logs.push(errorLog)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    console.error("CRITICAL Error:", errorLog)
    this.sendToTrackingService(errorLog)
  }

  /**
   * Send error to tracking service (Sentry, LogRocket, etc.)
   */
  private sendToTrackingService(errorLog: ErrorLog): void {
    // TODO: Integrate with Sentry or similar service
    // Example:
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureException(new Error(errorLog.message), {
    //     extra: errorLog.context,
    //     level: errorLog.severity,
    //   })
    // }

    // For now, just log to console in production
    if (process.env.NODE_ENV === "production") {
      // In production, you might want to send to a logging service
      // or write to a file
      console.error("Production Error:", JSON.stringify(errorLog))
    }
  }

  /**
   * Get recent error logs
   */
  getRecentLogs(limit: number = 50): ErrorLog[] {
    return this.logs.slice(-limit).reverse()
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = []
  }
}

export const errorLogger = new ErrorLogger()

/**
 * Helper function to log API errors
 */
export function logApiError(
  error: Error | string,
  req: Request,
  userId?: string,
  additionalContext?: Record<string, any>
): void {
  const url = new URL(req.url)
  errorLogger.log(typeof error === "string" ? error : error, {
    path: url.pathname,
    method: req.method,
    userId,
    ...additionalContext,
  })
}

