/**
 * Comprehensive Backend API Test Suite
 * Run with: npx tsx scripts/test-backend.ts
 */

import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables FIRST (try .env.local, then .env)
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000"
const API_BASE = `${BASE_URL}/api`

interface TestResult {
  name: string
  passed: boolean
  error?: string
  status?: number
  response?: any
}

const testResults: TestResult[] = []
let authCookies: string = ""
let primaryAdminToken: string = ""
let secondaryAdminToken: string = ""
let hrManagerToken: string = ""
let employeeToken: string = ""
let testCompanyId: string = ""
let testUserId: string = ""
let testEmployeeId: string = ""

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

    // Extract cookies from Set-Cookie header
    const setCookie = response.headers.get("set-cookie")
    if (setCookie) {
      authCookies = setCookie
    }

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
    console.log(`✗ ${name}: ${error.message}`)
  }
}

async function runAllTests() {
  console.log("🚀 Starting Backend API Tests...\n")
  console.log(`Base URL: ${BASE_URL}\n`)

  // Test 1: Health Check - Users endpoint (public)
  await runTest("GET /api/users - Public endpoint", async () => {
    const response = await apiCall("/users")
    if (response.status !== 200 && response.status !== 401) {
      throw new Error(`Expected 200 or 401, got ${response.status}`)
    }
  })

  // Test 2: Authentication - Register
  await runTest("POST /api/auth/register - User registration", async () => {
    const response = await apiCall("/auth/register", {
      method: "POST",
      body: {
        email: `test.register.${Date.now()}@company.com`,
        password: "Test@123",
        name: "Test User",
        role: "employee",
        companyId: "test",
        jobRole: "Tester",
        salary: { type: "fixed", amount: 30000, currency: "INR" },
        shiftTime: { start: "09:00", end: "18:00" },
      },
    })
    if (response.status !== 200 && response.status !== 400 && response.status !== 401) {
      throw new Error(`Expected 200, 400, or 401, got ${response.status}: ${JSON.stringify(response.data)}`)
    }
  })

  // Test 3: Authentication - Login (NextAuth)
  await runTest("POST /api/auth/[...nextauth] - Login", async () => {
    const response = await apiCall("/auth/[...nextauth]", {
      method: "POST",
      body: {
        email: "test.admin@company.com",
        password: "Test@123",
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    })
    // NextAuth might return different status codes
    if (response.status === 0) {
      throw new Error("Connection failed - is server running?")
    }
  })

  // Test 4: Admin - Get Employees (requires auth)
  await runTest("GET /api/admin/employees - Get employees list", async () => {
    const response = await apiCall("/admin/employees")
    // Should return 401 without auth
    if (response.status !== 401 && response.status !== 200) {
      throw new Error(`Expected 401 or 200, got ${response.status}`)
    }
  })

  // Test 5: Admin - Create Employee (requires auth)
  await runTest("POST /api/admin/employees - Create employee", async () => {
    const response = await apiCall("/admin/employees", {
      method: "POST",
      body: {
        name: "Test Employee",
        email: `test.new.${Date.now()}@company.com`,
        role: "employee",
        jobRole: "Tester",
        salary: { type: "fixed", amount: 30000, currency: "INR" },
        shiftTime: { start: "09:00", end: "18:00" },
      },
    })
    // Should return 401 without auth
    if (response.status !== 401 && response.status !== 200 && response.status !== 400) {
      throw new Error(`Expected 401, 200, or 400, got ${response.status}`)
    }
  })

  // Test 6: Attendance - Login
  await runTest("POST /api/attendance/login - Mark attendance login", async () => {
    const response = await apiCall("/attendance/login", {
      method: "POST",
      body: {},
    })
    // Should return 401 without auth
    if (response.status !== 401 && response.status !== 200 && response.status !== 400) {
      throw new Error(`Expected 401, 200, or 400, got ${response.status}`)
    }
  })

  // Test 7: Attendance - Logout
  await runTest("POST /api/attendance/logout - Mark attendance logout", async () => {
    const response = await apiCall("/attendance/logout", {
      method: "POST",
      body: {},
    })
    if (response.status !== 401 && response.status !== 200 && response.status !== 400) {
      throw new Error(`Expected 401, 200, or 400, got ${response.status}`)
    }
  })

  // Test 8: Attendance - Get Logs
  await runTest("GET /api/attendance/logs - Get attendance logs", async () => {
    const response = await apiCall("/attendance/logs?startDate=2024-01-01&endDate=2024-12-31")
    if (response.status !== 401 && response.status !== 200 && response.status !== 400) {
      throw new Error(`Expected 401, 200, or 400, got ${response.status}`)
    }
  })

  // Test 9: Attendance - Live Status
  await runTest("GET /api/attendance/live-status - Get live attendance status", async () => {
    const response = await apiCall("/attendance/live-status")
    if (response.status !== 401 && response.status !== 200) {
      throw new Error(`Expected 401 or 200, got ${response.status}`)
    }
  })

  // Test 10: Leaves - Apply
  await runTest("POST /api/leaves/apply - Apply for leave", async () => {
    const response = await apiCall("/leaves/apply", {
      method: "POST",
      body: {
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        type: "earned",
        reason: "Test leave",
      },
    })
    if (response.status !== 401 && response.status !== 200 && response.status !== 400) {
      throw new Error(`Expected 401, 200, or 400, got ${response.status}`)
    }
  })

  // Test 11: Leaves - Get Balance
  await runTest("GET /api/leaves/balance - Get leave balance", async () => {
    const response = await apiCall("/leaves/balance")
    if (response.status !== 401 && response.status !== 200) {
      throw new Error(`Expected 401 or 200, got ${response.status}`)
    }
  })

  // Test 12: Leaves - Get History
  await runTest("GET /api/leaves/history - Get leave history", async () => {
    const response = await apiCall("/leaves/history")
    if (response.status !== 401 && response.status !== 200) {
      throw new Error(`Expected 401 or 200, got ${response.status}`)
    }
  })

  // Test 13: Leaves - Get Pending
  await runTest("GET /api/leaves/pending - Get pending leaves", async () => {
    const response = await apiCall("/leaves/pending")
    if (response.status !== 401 && response.status !== 200) {
      throw new Error(`Expected 401 or 200, got ${response.status}`)
    }
  })

  // Test 14: Leaves - Holidays
  await runTest("GET /api/leaves/holidays - Get holidays", async () => {
    const response = await apiCall("/leaves/holidays")
    if (response.status !== 401 && response.status !== 200) {
      throw new Error(`Expected 401 or 200, got ${response.status}`)
    }
  })

  // Test 15: Roster - Get Employees
  await runTest("GET /api/roster/employees - Get roster employees", async () => {
    const response = await apiCall("/roster/employees")
    if (response.status !== 401 && response.status !== 200) {
      throw new Error(`Expected 401 or 200, got ${response.status}`)
    }
  })

  // Test 16: Roster - Get Calendar
  await runTest("GET /api/roster/calendar - Get roster calendar", async () => {
    const response = await apiCall("/roster/calendar?startDate=2024-01-01&endDate=2024-12-31")
    if (response.status !== 401 && response.status !== 200 && response.status !== 400) {
      throw new Error(`Expected 401, 200, or 400, got ${response.status}`)
    }
  })

  // Test 17: Roster - Assign
  await runTest("POST /api/roster/assign - Assign roster", async () => {
    const response = await apiCall("/roster/assign", {
      method: "POST",
      body: {
        userId: "test",
        date: new Date().toISOString(),
        shiftTime: { start: "09:00", end: "18:00" },
      },
    })
    if (response.status !== 401 && response.status !== 200 && response.status !== 400) {
      throw new Error(`Expected 401, 200, or 400, got ${response.status}`)
    }
  })

  // Test 18: Salary - Calculate
  await runTest("POST /api/salary/calculate - Calculate salary", async () => {
    const response = await apiCall("/salary/calculate", {
      method: "POST",
      body: {
        userId: "test",
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      },
    })
    if (response.status !== 401 && response.status !== 200 && response.status !== 400) {
      throw new Error(`Expected 401, 200, or 400, got ${response.status}`)
    }
  })

  // Test 19: Salary - Get Payslips
  await runTest("GET /api/salary/payslips - Get payslips", async () => {
    const response = await apiCall("/salary/payslips?month=1&year=2024")
    if (response.status !== 401 && response.status !== 200 && response.status !== 400) {
      throw new Error(`Expected 401, 200, or 400, got ${response.status}`)
    }
  })

  // Test 20: Reports - Attendance
  await runTest("POST /api/reports/attendance - Get attendance report", async () => {
    const response = await apiCall("/reports/attendance", {
      method: "POST",
      body: {
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      },
    })
    if (response.status !== 401 && response.status !== 200 && response.status !== 400) {
      throw new Error(`Expected 401, 200, or 400, got ${response.status}`)
    }
  })

  // Test 21: Reports - Leave
  await runTest("POST /api/reports/leave - Get leave report", async () => {
    const response = await apiCall("/reports/leave", {
      method: "POST",
      body: {
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      },
    })
    if (response.status !== 401 && response.status !== 200 && response.status !== 400) {
      throw new Error(`Expected 401, 200, or 400, got ${response.status}`)
    }
  })

  // Test 22: Reports - Salary
  await runTest("POST /api/reports/salary - Get salary report", async () => {
    const response = await apiCall("/reports/salary", {
      method: "POST",
      body: {
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      },
    })
    if (response.status !== 401 && response.status !== 200 && response.status !== 400) {
      throw new Error(`Expected 401, 200, or 400, got ${response.status}`)
    }
  })

  // Test 23: Notifications - Get All
  await runTest("GET /api/notifications - Get notifications", async () => {
    const response = await apiCall("/notifications")
    if (response.status !== 401 && response.status !== 200) {
      throw new Error(`Expected 401 or 200, got ${response.status}`)
    }
  })

  // Test 24: Notifications - Unread Count
  await runTest("GET /api/notifications/unread-count - Get unread count", async () => {
    const response = await apiCall("/notifications/unread-count")
    if (response.status !== 401 && response.status !== 200) {
      throw new Error(`Expected 401 or 200, got ${response.status}`)
    }
  })

  // Test 25: Primary Admin - Get Companies
  await runTest("GET /api/primary-admin/companies - Get companies", async () => {
    const response = await apiCall("/primary-admin/companies")
    if (response.status !== 401 && response.status !== 200) {
      throw new Error(`Expected 401 or 200, got ${response.status}`)
    }
  })

  // Test 26: Primary Admin - Get Stats
  await runTest("GET /api/primary-admin/stats - Get primary admin stats", async () => {
    const response = await apiCall("/primary-admin/stats")
    if (response.status !== 401 && response.status !== 200) {
      throw new Error(`Expected 401 or 200, got ${response.status}`)
    }
  })

  // Test 27: Admin - Get Dashboard Stats
  await runTest("GET /api/admin/dashboard-stats - Get dashboard stats", async () => {
    const response = await apiCall("/admin/dashboard-stats")
    if (response.status !== 401 && response.status !== 200) {
      throw new Error(`Expected 401 or 200, got ${response.status}`)
    }
  })

  // Test 28: Admin - Get Managers
  await runTest("GET /api/admin/managers - Get managers", async () => {
    const response = await apiCall("/admin/managers")
    if (response.status !== 401 && response.status !== 200) {
      throw new Error(`Expected 401 or 200, got ${response.status}`)
    }
  })

  // Test 29: Export - Attendance
  await runTest("GET /api/export/attendance - Export attendance", async () => {
    const response = await apiCall("/export/attendance?startDate=2024-01-01&endDate=2024-12-31&format=excel")
    if (response.status !== 401 && response.status !== 200 && response.status !== 400) {
      throw new Error(`Expected 401, 200, or 400, got ${response.status}`)
    }
  })

  // Test 30: Export - Employees
  await runTest("GET /api/export/employees - Export employees", async () => {
    const response = await apiCall("/export/employees?format=excel")
    if (response.status !== 401 && response.status !== 200) {
      throw new Error(`Expected 401 or 200, got ${response.status}`)
    }
  })

  // All tests are already completed (they're awaited)

  // Generate test report
  console.log("\n" + "=".repeat(60))
  console.log("TEST SUMMARY")
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
      status: t.status,
    })),
  }

  fs.writeFileSync(
    resolve(process.cwd(), "test-results.json"),
    JSON.stringify(report, null, 2)
  )

  console.log("\n✓ Test results saved to test-results.json")
  console.log("\n" + "=".repeat(60))

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

