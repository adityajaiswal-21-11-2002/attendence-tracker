/**
 * Update BACKEND_TEST_CHECKLIST.md with test results from test-results.json
 * Run with: npx tsx scripts/update-checklist.ts
 */

import { readFileSync, writeFileSync } from "fs"
import { resolve } from "path"

interface TestResult {
  name: string
  passed: boolean
  error?: string
  status?: number
}

interface TestReport {
  timestamp: string
  summary: {
    total: number
    passed: number
    failed: number
    passRate: string
  }
  tests: TestResult[]
}

function getStatusIcon(passed: boolean): string {
  return passed ? "✅" : "❌"
}

function updateChecklist() {
  try {
    // Read test results
    const resultsPath = resolve(process.cwd(), "test-results.json")
    const resultsContent = readFileSync(resultsPath, "utf-8")
    const report: TestReport = JSON.parse(resultsContent)

    // Read checklist
    const checklistPath = resolve(process.cwd(), "BACKEND_TEST_CHECKLIST.md")
    let checklistContent = readFileSync(checklistPath, "utf-8")

    // Update summary
    checklistContent = checklistContent.replace(
      /(\*\*Last Updated:\*\* )\[Will be updated after test run\]/,
      `$1${new Date().toLocaleString()}`
    )
    checklistContent = checklistContent.replace(
      /(\*\*Test Date:\*\* )\[Will be updated after test run\]/,
      `$1${new Date().toLocaleString()}`
    )
    checklistContent = checklistContent.replace(
      /(\*\*Total Tests:\*\* )\d+/,
      `$1${report.summary.total}`
    )
    checklistContent = checklistContent.replace(
      /(\*\*Passed:\*\* )\d+/,
      `$1${report.summary.passed}`
    )
    checklistContent = checklistContent.replace(
      /(\*\*Failed:\*\* )\d+/,
      `$1${report.summary.failed}`
    )
    checklistContent = checklistContent.replace(
      /(\*\*Pass Rate:\*\* )[\d.]+%/,
      `$1${report.summary.passRate}`
    )

    // Update test statuses
    const testMapping: Record<string, number> = {
      "User Registration": 1,
      "User Login (NextAuth)": 2,
      "Public Users Endpoint": 3,
      "Get Employees": 4,
      "Create Employee": 5,
      "Get Dashboard Stats": 9,
      "Get Managers": 10,
      "Mark Login": 12,
      "Mark Logout": 13,
      "Get Attendance Logs": 14,
      "Get Live Status": 15,
      "Apply for Leave": 22,
      "Get Leave Balance": 23,
      "Get Leave History": 24,
      "Get Pending Leaves": 25,
      "Get Holidays": 28,
      "Get Roster Employees": 34,
      "Get Roster Calendar": 35,
      "Assign Roster": 37,
      "Calculate Salary": 44,
      "Get Payslips": 45,
      "Get Attendance Report": 51,
      "Get Leave Report": 52,
      "Get Salary Report": 53,
      "Get Notifications": 56,
      "Get Unread Count": 59,
      "Get Companies": 62,
      "Get Primary Admin Stats": 76,
      "Export Attendance": 77,
      "Export Employees": 78,
    }

    // Update each test status
    for (const test of report.tests) {
      // Find matching test in checklist
      const testName = test.name.split(" - ")[0] // Extract test name
      const testNumber = testMapping[testName]
      
      if (testNumber) {
        const statusIcon = getStatusIcon(test.passed)
        const statusText = test.passed ? "Passed" : "Failed"
        const notes = test.error ? test.error.substring(0, 50) : ""
        
        // Update the status column
        const regex = new RegExp(
          `(\\| ${testNumber} \\| [^|]+ \\| [^|]+ \\| [^|]+ \\| )⏳ Pending( \\| [^|]* \\|)`,
          "g"
        )
        checklistContent = checklistContent.replace(
          regex,
          `$1${statusIcon} ${statusText}$2${notes ? ` ${notes}` : ""}`
        )
      }
    }

    // Write updated checklist
    writeFileSync(checklistPath, checklistContent, "utf-8")
    console.log("✅ Checklist updated successfully!")
    console.log(`   Total: ${report.summary.total}`)
    console.log(`   Passed: ${report.summary.passed}`)
    console.log(`   Failed: ${report.summary.failed}`)
    console.log(`   Pass Rate: ${report.summary.passRate}`)
  } catch (error: any) {
    console.error("Error updating checklist:", error.message)
    if (error.code === "ENOENT") {
      console.error("   Make sure test-results.json exists. Run tests first.")
    }
    process.exit(1)
  }
}

updateChecklist()

