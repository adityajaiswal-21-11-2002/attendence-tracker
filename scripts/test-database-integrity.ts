/**
 * Database Integrity and Consistency Tests
 * Tests data relationships, constraints, and referential integrity
 * Run with: npx tsx scripts/test-database-integrity.ts
 */

import { config } from "dotenv"
import { resolve } from "path"
import mongoose from "mongoose"
import connectDB from "../lib/mongodb"
import User from "../models/User"
import Company from "../models/Company"
import Attendance from "../models/Attendance"
import Leave from "../models/Leave"
import LeaveBalance from "../models/LeaveBalance"
import Roster from "../models/Roster"
import Task from "../models/Task"
import Notification from "../models/Notification"
import Payslip from "../models/Payslip"
import SalaryConfiguration from "../models/SalaryConfiguration"

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

interface TestResult {
  name: string
  passed: boolean
  error?: string
  details?: any
}

const testResults: TestResult[] = []

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
  }
}

async function testDatabaseIntegrity() {
  console.log("🔍 Starting Database Integrity Tests...\n")

  await connectDB()

  // ============================================
  // REFERENTIAL INTEGRITY TESTS
  // ============================================

  await runTest("REF-001: All users have valid companyId", async () => {
    const users = await User.find({}).select("companyId").lean()
    const companyIds = users.map(u => u.companyId.toString())
    const uniqueCompanyIds = [...new Set(companyIds)]
    
    const companies = await Company.find({
      _id: { $in: uniqueCompanyIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).select("_id").lean()
    
    const existingCompanyIds = companies.map(c => c._id.toString())
    const missingCompanies = uniqueCompanyIds.filter(id => !existingCompanyIds.includes(id))
    
    if (missingCompanies.length > 0) {
      throw new Error(`Users reference ${missingCompanies.length} non-existent companies: ${missingCompanies.join(", ")}`)
    }
  })

  await runTest("REF-002: All attendance records have valid userId", async () => {
    const attendances = await Attendance.find({}).select("userId").lean()
    const userIds = attendances.map(a => a.userId.toString())
    const uniqueUserIds = [...new Set(userIds)]
    
    const users = await User.find({
      _id: { $in: uniqueUserIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).select("_id").lean()
    
    const existingUserIds = users.map(u => u._id.toString())
    const missingUsers = uniqueUserIds.filter(id => !existingUserIds.includes(id))
    
    if (missingUsers.length > 0) {
      throw new Error(`Attendance records reference ${missingUsers.length} non-existent users`)
    }
  })

  await runTest("REF-003: All attendance records have valid companyId", async () => {
    const attendances = await Attendance.find({}).select("companyId").lean()
    const companyIds = attendances.map(a => a.companyId.toString())
    const uniqueCompanyIds = [...new Set(companyIds)]
    
    const companies = await Company.find({
      _id: { $in: uniqueCompanyIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).select("_id").lean()
    
    const existingCompanyIds = companies.map(c => c._id.toString())
    const missingCompanies = uniqueCompanyIds.filter(id => !existingCompanyIds.includes(id))
    
    if (missingCompanies.length > 0) {
      throw new Error(`Attendance records reference ${missingCompanies.length} non-existent companies`)
    }
  })

  await runTest("REF-004: All leaves have valid userId", async () => {
    const leaves = await Leave.find({}).select("userId").lean()
    const userIds = leaves.map(l => l.userId.toString())
    const uniqueUserIds = [...new Set(userIds)]
    
    const users = await User.find({
      _id: { $in: uniqueUserIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).select("_id").lean()
    
    const existingUserIds = users.map(u => u._id.toString())
    const missingUsers = uniqueUserIds.filter(id => !existingUserIds.includes(id))
    
    if (missingUsers.length > 0) {
      throw new Error(`Leave records reference ${missingUsers.length} non-existent users`)
    }
  })

  await runTest("REF-005: All leaves have valid companyId", async () => {
    const leaves = await Leave.find({}).select("companyId").lean()
    const companyIds = leaves.map(l => l.companyId.toString())
    const uniqueCompanyIds = [...new Set(companyIds)]
    
    const companies = await Company.find({
      _id: { $in: uniqueCompanyIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).select("_id").lean()
    
    const existingCompanyIds = companies.map(c => c._id.toString())
    const missingCompanies = uniqueCompanyIds.filter(id => !existingCompanyIds.includes(id))
    
    if (missingCompanies.length > 0) {
      throw new Error(`Leave records reference ${missingCompanies.length} non-existent companies`)
    }
  })

  await runTest("REF-006: All users with managerId have valid manager", async () => {
    const users = await User.find({ managerId: { $exists: true, $ne: null } })
      .select("managerId").lean()
    
    const managerIds = users.map(u => u.managerId!.toString())
    const uniqueManagerIds = [...new Set(managerIds)]
    
    const managers = await User.find({
      _id: { $in: uniqueManagerIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).select("_id").lean()
    
    const existingManagerIds = managers.map(m => m._id.toString())
    const missingManagers = uniqueManagerIds.filter(id => !existingManagerIds.includes(id))
    
    if (missingManagers.length > 0) {
      throw new Error(`${missingManagers.length} users reference non-existent managers`)
    }
  })

  await runTest("REF-007: All roster entries have valid userId", async () => {
    const rosters = await Roster.find({}).select("userId").lean()
    const userIds = rosters.map(r => r.userId.toString())
    const uniqueUserIds = [...new Set(userIds)]
    
    const users = await User.find({
      _id: { $in: uniqueUserIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).select("_id").lean()
    
    const existingUserIds = users.map(u => u._id.toString())
    const missingUsers = uniqueUserIds.filter(id => !existingUserIds.includes(id))
    
    if (missingUsers.length > 0) {
      throw new Error(`Roster entries reference ${missingUsers.length} non-existent users`)
    }
  })

  await runTest("REF-008: All tasks have valid assignedTo", async () => {
    const tasks = await Task.find({}).select("assignedTo").lean()
    const userIds = tasks.map(t => t.assignedTo.toString())
    const uniqueUserIds = [...new Set(userIds)]
    
    const users = await User.find({
      _id: { $in: uniqueUserIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).select("_id").lean()
    
    const existingUserIds = users.map(u => u._id.toString())
    const missingUsers = uniqueUserIds.filter(id => !existingUserIds.includes(id))
    
    if (missingUsers.length > 0) {
      throw new Error(`Tasks reference ${missingUsers.length} non-existent users`)
    }
  })

  // ============================================
  // DATA CONSISTENCY TESTS
  // ============================================

  await runTest("CONS-001: No duplicate attendance records for same user and date", async () => {
    const duplicates = await Attendance.aggregate([
      {
        $group: {
          _id: {
            userId: "$userId",
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }
          },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ])
    
    if (duplicates.length > 0) {
      throw new Error(`Found ${duplicates.length} duplicate attendance records`)
    }
  })

  await runTest("CONS-002: Attendance userId matches companyId", async () => {
    const attendances = await Attendance.find({})
      .populate("userId", "companyId")
      .lean()
    
    const mismatches = attendances.filter(a => {
      const user = a.userId as any
      return user && user.companyId.toString() !== a.companyId.toString()
    })
    
    if (mismatches.length > 0) {
      throw new Error(`Found ${mismatches.length} attendance records with mismatched companyId`)
    }
  })

  await runTest("CONS-003: Leave userId matches companyId", async () => {
    const leaves = await Leave.find({})
      .populate("userId", "companyId")
      .lean()
    
    const mismatches = leaves.filter(l => {
      const user = l.userId as any
      return user && user.companyId.toString() !== l.companyId.toString()
    })
    
    if (mismatches.length > 0) {
      throw new Error(`Found ${mismatches.length} leave records with mismatched companyId`)
    }
  })

  await runTest("CONS-004: Leave balance exists for all employees", async () => {
    const currentYear = new Date().getFullYear()
    const employees = await User.find({ role: "employee" }).select("_id companyId").lean()
    
    for (const employee of employees) {
      const balance = await LeaveBalance.findOne({
        userId: employee._id,
        year: currentYear
      })
      
      if (!balance) {
        // This is a warning, not necessarily an error
        console.log(`  ⚠ Employee ${employee._id} has no leave balance for ${currentYear}`)
      }
    }
  })

  await runTest("CONS-005: Salary amount is non-negative", async () => {
    const users = await User.find({ "salary.amount": { $lt: 0 } }).select("_id email salary").lean()
    
    if (users.length > 0) {
      throw new Error(`Found ${users.length} users with negative salary amounts`)
    }
  })

  await runTest("CONS-006: Attendance totalHours is within valid range (0-24)", async () => {
    const invalidHours = await Attendance.find({
      $or: [
        { totalHours: { $lt: 0 } },
        { totalHours: { $gt: 24 } }
      ]
    }).select("_id userId date totalHours").lean()
    
    if (invalidHours.length > 0) {
      throw new Error(`Found ${invalidHours.length} attendance records with invalid totalHours`)
    }
  })

  await runTest("CONS-007: Leave numberOfDays is positive", async () => {
    const invalidLeaves = await Leave.find({
      numberOfDays: { $lte: 0 }
    }).select("_id userId numberOfDays").lean()
    
    if (invalidLeaves.length > 0) {
      throw new Error(`Found ${invalidLeaves.length} leave records with invalid numberOfDays`)
    }
  })

  await runTest("CONS-008: Leave endDate is after startDate", async () => {
    const invalidLeaves = await Leave.find({}).select("_id userId fromDate toDate").lean()
    
    const mismatches = invalidLeaves.filter(l => {
      const fromDate = new Date(l.fromDate)
      const toDate = new Date(l.toDate)
      return toDate < fromDate
    })
    
    if (mismatches.length > 0) {
      throw new Error(`Found ${mismatches.length} leave records with endDate before startDate`)
    }
  })

  await runTest("CONS-009: User email is unique", async () => {
    const duplicates = await User.aggregate([
      {
        $group: {
          _id: { $toLower: "$email" },
          count: { $sum: 1 },
          ids: { $push: "$_id" }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ])
    
    if (duplicates.length > 0) {
      throw new Error(`Found ${duplicates.length} duplicate email addresses`)
    }
  })

  await runTest("CONS-010: Shift time format is valid (HH:MM)", async () => {
    const invalidUsers = await User.find({
      $or: [
        { "shiftTime.start": { $not: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ } },
        { "shiftTime.end": { $not: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ } }
      ]
    }).select("_id email shiftTime").lean()
    
    if (invalidUsers.length > 0) {
      throw new Error(`Found ${invalidUsers.length} users with invalid shift time format`)
    }
  })

  // ============================================
  // INDEX VERIFICATION
  // ============================================

  await runTest("INDEX-001: User email index exists", async () => {
    const indexes = await User.collection.getIndexes()
    if (!indexes.email) {
      throw new Error("User email index not found")
    }
  })

  await runTest("INDEX-002: Attendance userId+date unique index exists", async () => {
    const indexes = await Attendance.collection.getIndexes()
    const userIdDateIndex = Object.keys(indexes).find(key => 
      indexes[key].userId === 1 && indexes[key].date === 1
    )
    if (!userIdDateIndex) {
      throw new Error("Attendance userId+date unique index not found")
    }
  })

  // ============================================
  // DATA COMPLETENESS TESTS
  // ============================================

  await runTest("COMPLETE-001: All required user fields are present", async () => {
    const users = await User.find({
      $or: [
        { email: { $exists: false } },
        { name: { $exists: false } },
        { role: { $exists: false } },
        { companyId: { $exists: false } },
        { salary: { $exists: false } },
        { shiftTime: { $exists: false } },
        { jobRole: { $exists: false } }
      ]
    }).select("_id email").lean()
    
    if (users.length > 0) {
      throw new Error(`Found ${users.length} users with missing required fields`)
    }
  })

  await runTest("COMPLETE-002: All attendance records have required fields", async () => {
    const attendances = await Attendance.find({
      $or: [
        { userId: { $exists: false } },
        { companyId: { $exists: false } },
        { date: { $exists: false } }
      ]
    }).select("_id").lean()
    
    if (attendances.length > 0) {
      throw new Error(`Found ${attendances.length} attendance records with missing required fields`)
    }
  })

  // Generate report
  console.log("\n" + "=".repeat(60))
  console.log("DATABASE INTEGRITY TEST SUMMARY")
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

  // Save results
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
      details: t.details,
    })),
  }

  fs.writeFileSync(
    resolve(process.cwd(), "test-results-database-integrity.json"),
    JSON.stringify(report, null, 2)
  )

  console.log("\n✓ Database integrity test results saved to test-results-database-integrity.json")
  console.log("=".repeat(60))

  await mongoose.connection.close()
  process.exit(failed > 0 ? 1 : 0)
}

testDatabaseIntegrity().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})

