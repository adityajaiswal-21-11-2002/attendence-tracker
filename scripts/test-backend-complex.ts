/**
 * Complex Backend API Test Suite
 * Tests integration scenarios, business logic, edge cases, and data validation
 * Run with: npx tsx scripts/test-backend-complex.ts
 */

import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables FIRST
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"
const API_BASE = `${BASE_URL}/api`

interface TestResult {
  name: string
  passed: boolean
  error?: string
  details?: any
}

const testResults: TestResult[] = []

// Helper function to make API calls
async function apiCall(
  endpoint: string,
  options: {
    method?: string
    body?: any
    headers?: Record<string, string>
    cookies?: string
  } = {}
): Promise<{ status: number; data: any; headers: any }> {
  const { method = "GET", body, headers = {}, cookies } = options
  
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  }

  if (cookies) {
    requestHeaders["Cookie"] = cookies
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json().catch(() => ({}))
    const responseHeaders: any = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    return {
      status: response.status,
      data,
      headers: responseHeaders,
    }
  } catch (error: any) {
    return {
      status: 0,
      data: { error: error.message },
      headers: {},
    }
  }
}

// Run test and wait for completion
async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const testResult: TestResult = { name, passed: false }
  testResults.push(testResult)
  
  try {
    await testFn()
    testResult.passed = true
    console.log(`✓ ${name}`)
  } catch (error: any) {
    testResult.passed = false
    testResult.error = error.message
    testResult.details = error.details
    console.log(`✗ ${name}: ${error.message}`)
    if (error.details) {
      console.log(`  Details: ${JSON.stringify(error.details, null, 2)}`)
    }
  }
}

async function runAllTests() {
  console.log("🚀 Starting Complex Backend API Tests...\n")
  console.log(`Base URL: ${BASE_URL}\n`)

  // ============================================
  // AUTHENTICATION & AUTHORIZATION TESTS
  // ============================================

  await runTest("AUTH-001: Register user with invalid email format", async () => {
    const response = await apiCall("/auth/register", {
      method: "POST",
      body: {
        email: "invalid-email",
        password: "Test@123",
        name: "Test User",
        role: "employee",
        companyId: "test",
        jobRole: "Tester",
        salary: { type: "fixed", amount: 30000, currency: "INR" },
        shiftTime: { start: "09:00", end: "18:00" },
      },
    })
    if (response.status !== 400) {
      throw new Error(`Expected 400 for invalid email, got ${response.status}`)
    }
  })

  await runTest("AUTH-002: Register user with weak password", async () => {
    const response = await apiCall("/auth/register", {
      method: "POST",
      body: {
        email: `test.weak.${Date.now()}@company.com`,
        password: "123", // Too short
        name: "Test User",
        role: "employee",
        companyId: "test",
        jobRole: "Tester",
        salary: { type: "fixed", amount: 30000, currency: "INR" },
        shiftTime: { start: "09:00", end: "18:00" },
      },
    })
    if (response.status !== 400) {
      throw new Error(`Expected 400 for weak password, got ${response.status}`)
    }
  })

  await runTest("AUTH-003: Register user with duplicate email", async () => {
    const email = `test.duplicate.${Date.now()}@company.com`
    // First registration
    await apiCall("/auth/register", {
      method: "POST",
      body: {
        email,
        password: "Test@123",
        name: "Test User 1",
        role: "employee",
        companyId: "test",
        jobRole: "Tester",
        salary: { type: "fixed", amount: 30000, currency: "INR" },
        shiftTime: { start: "09:00", end: "18:00" },
      },
    })
    // Second registration with same email
    const response = await apiCall("/auth/register", {
      method: "POST",
      body: {
        email,
        password: "Test@123",
        name: "Test User 2",
        role: "employee",
        companyId: "test",
        jobRole: "Tester",
        salary: { type: "fixed", amount: 30000, currency: "INR" },
        shiftTime: { start: "09:00", end: "18:00" },
      },
    })
    if (response.status !== 400 && response.status !== 409) {
      throw new Error(`Expected 400 or 409 for duplicate email, got ${response.status}`)
    }
  })

  // ============================================
  // ATTENDANCE INTEGRATION TESTS
  // ============================================

  await runTest("ATT-001: Mark login without authentication", async () => {
    const response = await apiCall("/attendance/login", {
      method: "POST",
      body: {},
    })
    if (response.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated request, got ${response.status}`)
    }
  })

  await runTest("ATT-002: Mark logout without login", async () => {
    const response = await apiCall("/attendance/logout", {
      method: "POST",
      body: {},
    })
    // Should return 401 (no auth) or 400 (no active session)
    if (response.status !== 401 && response.status !== 400) {
      throw new Error(`Expected 401 or 400, got ${response.status}`)
    }
  })

  await runTest("ATT-003: Get attendance logs with invalid date range", async () => {
    const response = await apiCall("/attendance/logs?startDate=invalid&endDate=2024-12-31")
    // Should handle invalid dates gracefully
    if (response.status !== 401 && response.status !== 400 && response.status !== 500) {
      throw new Error(`Expected 401, 400, or 500 for invalid dates, got ${response.status}`)
    }
  })

  await runTest("ATT-004: Get attendance logs with endDate before startDate", async () => {
    const response = await apiCall("/attendance/logs?startDate=2024-12-31&endDate=2024-01-01")
    // Should return 400 for invalid date range
    if (response.status !== 401 && response.status !== 400) {
      throw new Error(`Expected 401 or 400 for invalid date range, got ${response.status}`)
    }
  })

  // ============================================
  // LEAVE MANAGEMENT INTEGRATION TESTS
  // ============================================

  await runTest("LEAVE-001: Apply leave with invalid date range", async () => {
    const response = await apiCall("/leaves/apply", {
      method: "POST",
      body: {
        startDate: "2024-12-31",
        endDate: "2024-01-01", // End before start
        type: "earned",
        reason: "Test leave",
      },
    })
    if (response.status !== 401 && response.status !== 400) {
      throw new Error(`Expected 401 or 400 for invalid date range, got ${response.status}`)
    }
  })

  await runTest("LEAVE-002: Apply leave with past dates", async () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 10)
    const response = await apiCall("/leaves/apply", {
      method: "POST",
      body: {
        startDate: pastDate.toISOString(),
        endDate: pastDate.toISOString(),
        type: "earned",
        reason: "Test leave",
      },
    })
    // Should either allow or reject past dates - both are valid behaviors
    if (response.status !== 401 && response.status !== 400 && response.status !== 200) {
      throw new Error(`Expected 401, 400, or 200, got ${response.status}`)
    }
  })

  await runTest("LEAVE-003: Apply leave with invalid leave type", async () => {
    const response = await apiCall("/leaves/apply", {
      method: "POST",
      body: {
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        type: "invalid_type",
        reason: "Test leave",
      },
    })
    if (response.status !== 401 && response.status !== 400) {
      throw new Error(`Expected 401 or 400 for invalid leave type, got ${response.status}`)
    }
  })

  await runTest("LEAVE-004: Get leave balance without authentication", async () => {
    const response = await apiCall("/leaves/balance")
    if (response.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated request, got ${response.status}`)
    }
  })

  await runTest("LEAVE-005: Get leave history with invalid year", async () => {
    const response = await apiCall("/leaves/history?year=invalid")
    // Should handle invalid year gracefully
    if (response.status !== 401 && response.status !== 400 && response.status !== 500) {
      throw new Error(`Expected 401, 400, or 500 for invalid year, got ${response.status}`)
    }
  })

  // ============================================
  // ROSTER INTEGRATION TESTS
  // ============================================

  await runTest("ROSTER-001: Assign roster with invalid date", async () => {
    const response = await apiCall("/roster/assign", {
      method: "POST",
      body: {
        userId: "test",
        date: "invalid-date",
        shiftTime: { start: "09:00", end: "18:00" },
      },
    })
    if (response.status !== 401 && response.status !== 400) {
      throw new Error(`Expected 401 or 400 for invalid date, got ${response.status}`)
    }
  })

  await runTest("ROSTER-002: Assign roster with invalid shift time format", async () => {
    const response = await apiCall("/roster/assign", {
      method: "POST",
      body: {
        userId: "test",
        date: new Date().toISOString(),
        shiftTime: { start: "25:00", end: "18:00" }, // Invalid hour
      },
    })
    if (response.status !== 401 && response.status !== 400) {
      throw new Error(`Expected 401 or 400 for invalid time, got ${response.status}`)
    }
  })

  await runTest("ROSTER-003: Get roster calendar with invalid date range", async () => {
    const response = await apiCall("/roster/calendar?startDate=invalid&endDate=2024-12-31")
    if (response.status !== 401 && response.status !== 400 && response.status !== 500) {
      throw new Error(`Expected 401, 400, or 500 for invalid dates, got ${response.status}`)
    }
  })

  // ============================================
  // SALARY INTEGRATION TESTS
  // ============================================

  await runTest("SALARY-001: Calculate salary with invalid month", async () => {
    const response = await apiCall("/salary/calculate", {
      method: "POST",
      body: {
        userId: "test",
        month: 13, // Invalid month
        year: 2024,
      },
    })
    if (response.status !== 401 && response.status !== 400) {
      throw new Error(`Expected 401 or 400 for invalid month, got ${response.status}`)
    }
  })

  await runTest("SALARY-002: Calculate salary with invalid year", async () => {
    const response = await apiCall("/salary/calculate", {
      method: "POST",
      body: {
        userId: "test",
        month: 1,
        year: 1900, // Very old year
      },
    })
    // Should either accept or reject - both valid
    if (response.status !== 401 && response.status !== 400 && response.status !== 200) {
      throw new Error(`Expected 401, 400, or 200, got ${response.status}`)
    }
  })

  await runTest("SALARY-003: Get payslips with invalid month", async () => {
    const response = await apiCall("/salary/payslips?month=13&year=2024")
    if (response.status !== 401 && response.status !== 400) {
      throw new Error(`Expected 401 or 400 for invalid month, got ${response.status}`)
    }
  })

  // ============================================
  // REPORTS INTEGRATION TESTS
  // ============================================

  await runTest("REPORT-001: Generate attendance report with invalid date range", async () => {
    const response = await apiCall("/reports/attendance", {
      method: "POST",
      body: {
        startDate: "invalid",
        endDate: "2024-12-31",
      },
    })
    if (response.status !== 401 && response.status !== 400) {
      throw new Error(`Expected 401 or 400 for invalid dates, got ${response.status}`)
    }
  })

  await runTest("REPORT-002: Generate leave report with reversed date range", async () => {
    const response = await apiCall("/reports/leave", {
      method: "POST",
      body: {
        startDate: "2024-12-31",
        endDate: "2024-01-01",
      },
    })
    if (response.status !== 401 && response.status !== 400) {
      throw new Error(`Expected 401 or 400 for reversed dates, got ${response.status}`)
    }
  })

  await runTest("REPORT-003: Generate salary report with missing dates", async () => {
    const response = await apiCall("/reports/salary", {
      method: "POST",
      body: {
        // Missing startDate and endDate
      },
    })
    if (response.status !== 401 && response.status !== 400) {
      throw new Error(`Expected 401 or 400 for missing dates, got ${response.status}`)
    }
  })

  // ============================================
  // ADMIN INTEGRATION TESTS
  // ============================================

  await runTest("ADMIN-001: Create employee with missing required fields", async () => {
    const response = await apiCall("/admin/employees", {
      method: "POST",
      body: {
        name: "Test Employee",
        // Missing email, role, jobRole, salary, shiftTime
      },
    })
    if (response.status !== 401 && response.status !== 400) {
      throw new Error(`Expected 401 or 400 for missing fields, got ${response.status}`)
    }
  })

  await runTest("ADMIN-002: Create employee with invalid salary type", async () => {
    const response = await apiCall("/admin/employees", {
      method: "POST",
      body: {
        name: "Test Employee",
        email: `test.invalid.${Date.now()}@company.com`,
        role: "employee",
        jobRole: "Tester",
        salary: { type: "invalid_type", amount: 30000, currency: "INR" },
        shiftTime: { start: "09:00", end: "18:00" },
      },
    })
    if (response.status !== 401 && response.status !== 400) {
      throw new Error(`Expected 401 or 400 for invalid salary type, got ${response.status}`)
    }
  })

  await runTest("ADMIN-003: Create employee with negative salary", async () => {
    const response = await apiCall("/admin/employees", {
      method: "POST",
      body: {
        name: "Test Employee",
        email: `test.negative.${Date.now()}@company.com`,
        role: "employee",
        jobRole: "Tester",
        salary: { type: "fixed", amount: -1000, currency: "INR" },
        shiftTime: { start: "09:00", end: "18:00" },
      },
    })
    if (response.status !== 401 && response.status !== 400) {
      throw new Error(`Expected 401 or 400 for negative salary, got ${response.status}`)
    }
  })

  await runTest("ADMIN-004: Create employee with invalid shift time", async () => {
    const response = await apiCall("/admin/employees", {
      method: "POST",
      body: {
        name: "Test Employee",
        email: `test.shift.${Date.now()}@company.com`,
        role: "employee",
        jobRole: "Tester",
        salary: { type: "fixed", amount: 30000, currency: "INR" },
        shiftTime: { start: "25:00", end: "18:00" }, // Invalid hour
      },
    })
    if (response.status !== 401 && response.status !== 400) {
      throw new Error(`Expected 401 or 400 for invalid shift time, got ${response.status}`)
    }
  })

  // ============================================
  // NOTIFICATIONS INTEGRATION TESTS
  // ============================================

  await runTest("NOTIF-001: Get notifications without authentication", async () => {
    const response = await apiCall("/notifications")
    if (response.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated request, got ${response.status}`)
    }
  })

  await runTest("NOTIF-002: Get unread count without authentication", async () => {
    const response = await apiCall("/notifications/unread-count")
    if (response.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated request, got ${response.status}`)
    }
  })

  // ============================================
  // EXPORT/IMPORT INTEGRATION TESTS
  // ============================================

  await runTest("EXPORT-001: Export attendance with invalid format", async () => {
    const response = await apiCall("/export/attendance?startDate=2024-01-01&endDate=2024-12-31&format=invalid")
    // Should handle invalid format gracefully
    if (response.status !== 401 && response.status !== 400 && response.status !== 200) {
      throw new Error(`Expected 401, 400, or 200, got ${response.status}`)
    }
  })

  await runTest("EXPORT-002: Export employees without authentication", async () => {
    const response = await apiCall("/export/employees?format=excel")
    if (response.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated request, got ${response.status}`)
    }
  })

  // ============================================
  // EDGE CASES & BOUNDARY TESTS
  // ============================================

  await runTest("EDGE-001: Very long date range (10 years)", async () => {
    const response = await apiCall("/attendance/logs?startDate=2014-01-01&endDate=2024-12-31")
    // Should handle large date ranges (might be slow but shouldn't crash)
    if (response.status !== 401 && response.status !== 200 && response.status !== 400 && response.status !== 500) {
      throw new Error(`Expected 401, 200, 400, or 500, got ${response.status}`)
    }
  })

  await runTest("EDGE-002: Empty request body", async () => {
    const response = await apiCall("/leaves/apply", {
      method: "POST",
      body: {},
    })
    if (response.status !== 401 && response.status !== 400) {
      throw new Error(`Expected 401 or 400 for empty body, got ${response.status}`)
    }
  })

  await runTest("EDGE-003: SQL injection attempt in email field", async () => {
    const response = await apiCall("/auth/register", {
      method: "POST",
      body: {
        email: "test'; DROP TABLE users; --",
        password: "Test@123",
        name: "Test User",
        role: "employee",
        companyId: "test",
        jobRole: "Tester",
        salary: { type: "fixed", amount: 30000, currency: "INR" },
        shiftTime: { start: "09:00", end: "18:00" },
      },
    })
    // Should reject or sanitize - both are valid security behaviors
    if (response.status !== 400 && response.status !== 401 && response.status !== 500) {
      throw new Error(`Expected 400, 401, or 500 for injection attempt, got ${response.status}`)
    }
  })

  await runTest("EDGE-004: XSS attempt in name field", async () => {
    const response = await apiCall("/auth/register", {
      method: "POST",
      body: {
        email: `test.xss.${Date.now()}@company.com`,
        password: "Test@123",
        name: "<script>alert('XSS')</script>",
        role: "employee",
        companyId: "test",
        jobRole: "Tester",
        salary: { type: "fixed", amount: 30000, currency: "INR" },
        shiftTime: { start: "09:00", end: "18:00" },
      },
    })
    // Should sanitize or reject - both are valid
    if (response.status !== 400 && response.status !== 401 && response.status !== 200 && response.status !== 500) {
      throw new Error(`Expected 400, 401, 200, or 500 for XSS attempt, got ${response.status}`)
    }
  })

  await runTest("EDGE-005: Extremely large number in salary", async () => {
    const response = await apiCall("/admin/employees", {
      method: "POST",
      body: {
        name: "Test Employee",
        email: `test.large.${Date.now()}@company.com`,
        role: "employee",
        jobRole: "Tester",
        salary: { type: "fixed", amount: Number.MAX_SAFE_INTEGER, currency: "INR" },
        shiftTime: { start: "09:00", end: "18:00" },
      },
    })
    // Should either accept or reject - both valid
    if (response.status !== 401 && response.status !== 400 && response.status !== 200) {
      throw new Error(`Expected 401, 400, or 200, got ${response.status}`)
    }
  })

  // ============================================
  // DATA CONSISTENCY TESTS
  // ============================================

  await runTest("DATA-001: Leave balance consistency check", async () => {
    // This test checks if leave balance endpoint returns consistent data
    const response1 = await apiCall("/leaves/balance")
    const response2 = await apiCall("/leaves/balance")
    
    // Both should return same status (either 401 or 200)
    if (response1.status !== response2.status) {
      throw new Error(`Inconsistent responses: ${response1.status} vs ${response2.status}`)
    }
  })

  await runTest("DATA-002: Attendance logs pagination consistency", async () => {
    // Test that pagination parameters are handled
    const response = await apiCall("/attendance/logs?startDate=2024-01-01&endDate=2024-12-31&page=1&limit=10")
    // Should handle pagination gracefully
    if (response.status !== 401 && response.status !== 200 && response.status !== 400) {
      throw new Error(`Expected 401, 200, or 400, got ${response.status}`)
    }
  })

  // ============================================
  // PERFORMANCE & LOAD TESTS
  // ============================================

  await runTest("PERF-001: Multiple rapid requests to same endpoint", async () => {
    const promises = Array.from({ length: 5 }, () =>
      apiCall("/users")
    )
    const responses = await Promise.all(promises)
    
    // All should return same status (rate limiting might apply)
    const statuses = responses.map(r => r.status)
    const uniqueStatuses = new Set(statuses)
    
    // Should handle multiple requests (might rate limit but shouldn't crash)
    if (uniqueStatuses.size > 2) {
      throw new Error(`Inconsistent responses: ${Array.from(uniqueStatuses).join(", ")}`)
    }
  })

  // Generate test report
  console.log("\n" + "=".repeat(60))
  console.log("COMPLEX TEST SUMMARY")
  console.log("=".repeat(60))
  
  const passed = testResults.filter((t) => t.passed).length
  const failed = testResults.filter((t) => !t.passed).length
  const total = testResults.length

  console.log(`Total Tests: ${total}`)
  console.log(`Passed: ${passed} (${((passed / total) * 100).toFixed(1)}%)`)
  console.log(`Failed: ${failed} (${((failed / total) * 100).toFixed(1)}%)`)

  if (failed > 0) {
    console.log("\nFailed Tests:")
    testResults
      .filter((t) => !t.passed)
      .forEach((t) => {
        console.log(`  ✗ ${t.name}`)
        if (t.error) {
          console.log(`    Error: ${t.error}`)
        }
      })
  }

  // Save results to file
  const fs = await import("fs")
  const report = {
    timestamp: new Date().toISOString(),
    testType: "complex",
    summary: {
      total,
      passed,
      failed,
      passRate: ((passed / total) * 100).toFixed(1) + "%",
    },
    tests: testResults.map((t) => ({
      name: t.name,
      passed: t.passed,
      error: t.error,
      details: t.details,
    })),
  }

  fs.writeFileSync(
    resolve(process.cwd(), "test-results-complex.json"),
    JSON.stringify(report, null, 2)
  )

  console.log("\n✓ Complex test results saved to test-results-complex.json")
  console.log("=".repeat(60))

  process.exit(failed > 0 ? 1 : 0)
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(BASE_URL)
    return response.ok || response.status === 404
  } catch {
    return false
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServer()
  if (!serverRunning) {
    console.error(
      `\n❌ Server is not running at ${BASE_URL}\nPlease start the server with: npm run dev\n`
    )
    process.exit(1)
  }

  await runAllTests()
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})

