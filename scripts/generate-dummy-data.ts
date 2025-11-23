/**
 * Generate comprehensive dummy data for testing
 * Run with: npx tsx scripts/generate-dummy-data.ts
 */

import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables FIRST before importing anything that uses them
const envLocalResult = config({ path: resolve(process.cwd(), ".env.local") })
const envResult = config({ path: resolve(process.cwd(), ".env") })

// Debug: Check if env vars are loaded
if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in environment variables")
  console.error("   Checked .env.local:", envLocalResult.error ? "not found" : "loaded")
  console.error("   Checked .env:", envResult.error ? "not found" : "loaded")
  console.error("   Please ensure MONGODB_URI is set in .env or .env.local")
  process.exit(1)
}

import mongoose from "mongoose"
import connectDB from "../lib/mongodb"
import User from "../models/User"
import Company from "../models/Company"
import Attendance from "../models/Attendance"
import Leave from "../models/Leave"
import LeaveBalance from "../models/LeaveBalance"
import Holiday from "../models/Holiday"
import Roster from "../models/Roster"
import Task from "../models/Task"
import Notification from "../models/Notification"
import Payslip from "../models/Payslip"
import SalaryConfiguration from "../models/SalaryConfiguration"
import { hashPassword } from "../lib/auth"
import { subDays, addDays, startOfMonth, endOfMonth, format } from "date-fns"

const ROLES = ["hr_manager", "operations_manager", "team_lead", "employee"] as const
const JOB_ROLES = [
  "Software Engineer",
  "Senior Software Engineer",
  "Product Manager",
  "Designer",
  "QA Engineer",
  "DevOps Engineer",
  "Business Analyst",
  "Project Manager",
  "HR Executive",
  "Operations Executive",
]

const NAMES = [
  "Rajesh Kumar", "Priya Sharma", "Amit Patel", "Sneha Reddy", "Vikram Singh",
  "Anjali Mehta", "Rahul Gupta", "Kavita Nair", "Suresh Iyer", "Deepika Joshi",
  "Manoj Desai", "Swati Agarwal", "Kiran Rao", "Neha Verma", "Arjun Malhotra",
  "Pooja Shah", "Ravi Menon", "Divya Kapoor", "Siddharth Nair", "Meera Krishnan",
]

async function generateDummyData() {
  try {
    console.log("Connecting to database...")
    await connectDB()

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log("Clearing existing test data...")
    await User.deleteMany({ email: { $regex: /^test\d+@/ } })
    await Attendance.deleteMany({})
    await Leave.deleteMany({})
    await LeaveBalance.deleteMany({})
    await Roster.deleteMany({})
    await Task.deleteMany({})
    await Notification.deleteMany({})
    await Payslip.deleteMany({})

    // Get or create test company
    let company = await Company.findOne({ email: "test@company.com" })
    if (!company) {
      company = await Company.create({
        name: "Test Company Pvt Ltd",
        email: "test@company.com",
        phone: "+91-9876543210",
        address: "123 Test Street, Test City, Test State 123456",
        subscriptionPlan: "100_employees",
        subscriptionPrice: 20000,
        subscriptionExpiry: addDays(new Date(), 365),
        isActive: true,
        createdBy: new mongoose.Types.ObjectId(),
      })
      console.log("✓ Test company created")
    } else {
      console.log("✓ Test company already exists")
    }

    // Create test users for each role
    const users: any[] = []
    const roles = ["primary_admin", "secondary_admin", ...ROLES]
    
    for (let i = 0; i < roles.length; i++) {
      const role = roles[i]
      const email = role === "primary_admin" 
        ? "test.admin@company.com"
        : role === "secondary_admin"
        ? "test.secondary@company.com"
        : `test.${role}${i}@company.com`
      
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        users.push(existingUser)
        continue
      }

      const hashedPassword = await hashPassword("Test@123")
      const user = await User.create({
        email,
        password: hashedPassword,
        name: role === "primary_admin" ? "Test Admin" 
          : role === "secondary_admin" ? "Test Secondary Admin"
          : NAMES[i % NAMES.length],
        phone: `+91-9876543${String(i).padStart(3, "0")}`,
        role: role as any,
        companyId: company._id,
        managerId: role === "employee" && users.length > 0 
          ? users.find(u => u.role === "team_lead")?._id 
          : undefined,
        salary: {
          type: role === "employee" ? (Math.random() > 0.5 ? "fixed" : "hourly") : "fixed",
          amount: role === "primary_admin" ? 100000 
            : role === "secondary_admin" ? 80000
            : role === "hr_manager" ? 60000
            : role === "operations_manager" ? 55000
            : role === "team_lead" ? 45000
            : Math.floor(Math.random() * 30000) + 25000,
          currency: "INR",
        },
        shiftTime: {
          start: "09:00",
          end: "18:00",
        },
        offDays: ["Saturday", "Sunday"],
        jobRole: JOB_ROLES[i % JOB_ROLES.length],
        isActive: true,
      })
      users.push(user)
      console.log(`✓ Created ${role}: ${user.email}`)
    }

    // Create more employees
    for (let i = 0; i < 20; i++) {
      const email = `test.employee${i}@company.com`
      const existingUser = await User.findOne({ email })
      if (existingUser) continue

      const hashedPassword = await hashPassword("Test@123")
      const employee = await User.create({
        email,
        password: hashedPassword,
        name: NAMES[i % NAMES.length],
        phone: `+91-9876543${String(i + 10).padStart(3, "0")}`,
        role: "employee",
        companyId: company._id,
        managerId: users.find(u => u.role === "team_lead")?._id,
        salary: {
          type: Math.random() > 0.5 ? "fixed" : "hourly",
          amount: Math.floor(Math.random() * 30000) + 25000,
          currency: "INR",
        },
        shiftTime: {
          start: "09:00",
          end: "18:00",
        },
        offDays: ["Saturday", "Sunday"],
        jobRole: JOB_ROLES[i % JOB_ROLES.length],
        isActive: true,
      })
      users.push(employee)
    }
    console.log(`✓ Created ${20} additional employees`)

    // Create leave balances for current year
    const currentYear = new Date().getFullYear()
    for (const user of users.filter(u => u.role === "employee")) {
      await LeaveBalance.create({
        userId: user._id,
        companyId: company._id,
        year: currentYear,
        earnedLeave: 12,
        sickLeave: 6,
        casualLeave: 6,
        compOff: 0,
      })
    }
    console.log("✓ Created leave balances")

    // Create attendance records for last 30 days
    const employees = users.filter(u => u.role === "employee")
    for (let day = 0; day < 30; day++) {
      const date = subDays(new Date(), day)
      const dayOfWeek = date.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      
      // Skip weekends for most employees
      for (const employee of employees) {
        if (isWeekend && Math.random() > 0.2) continue // 20% work on weekends
        
        const loginTime = new Date(date)
        loginTime.setHours(9 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0)
        
        const logoutTime = new Date(loginTime)
        logoutTime.setHours(18 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0)
        
        const totalHours = (logoutTime.getTime() - loginTime.getTime()) / (1000 * 60 * 60)
        
        await Attendance.create({
          userId: employee._id,
          companyId: company._id,
          date,
          loginTime,
          logoutTime,
          totalHours: Math.round(totalHours * 100) / 100,
          status: Math.random() > 0.9 ? "half_day" : "present",
          breaks: [],
        })
      }
    }
    console.log("✓ Created attendance records for last 30 days")

    // Create some leave applications
    for (let i = 0; i < 10; i++) {
      const employee = employees[Math.floor(Math.random() * employees.length)]
      const fromDate = addDays(new Date(), Math.floor(Math.random() * 30))
      const toDate = addDays(fromDate, Math.floor(Math.random() * 5))
      
      // Calculate number of days (inclusive of both start and end dates)
      const diffTime = Math.abs(toDate.getTime() - fromDate.getTime())
      const numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      
      const leaveTypes = ["earned", "sick", "casual"] as const
      const leaveType = leaveTypes[Math.floor(Math.random() * leaveTypes.length)]
      const status = Math.random() > 0.5 ? "pending" : Math.random() > 0.5 ? "approved" : "rejected"
      
      await Leave.create({
        userId: employee._id,
        companyId: company._id,
        fromDate,
        toDate,
        leaveType,
        numberOfDays,
        reason: `Test leave application ${i + 1}`,
        status,
        approvedBy: status === "approved" || status === "rejected" 
          ? users.find(u => u.role === "hr_manager")?._id 
          : undefined,
      })
    }
    console.log("✓ Created leave applications")

    // Create roster entries
    const operationsManager = users.find(u => u.role === "operations_manager")
    if (operationsManager) {
      const shiftTypes = ["morning", "evening", "night", "custom"] as const
      for (let day = 0; day < 14; day++) {
        const date = addDays(new Date(), day)
        for (const employee of employees.slice(0, 10)) {
          await Roster.create({
            userId: employee._id,
            companyId: company._id,
            date,
            shiftType: shiftTypes[Math.floor(Math.random() * shiftTypes.length)],
            shiftTime: {
              start: "09:00",
              end: "18:00",
            },
            jobRole: employee.jobRole,
            createdBy: operationsManager._id,
            tasks: [],
          })
        }
      }
      console.log("✓ Created roster entries")
    }

    // Create tasks
    const teamLead = users.find(u => u.role === "team_lead")
    if (teamLead) {
      const statuses = ["not_started", "in_progress", "paused", "completed"] as const
      for (let i = 0; i < 15; i++) {
        const employee = employees[Math.floor(Math.random() * employees.length)]
        const date = addDays(new Date(), Math.floor(Math.random() * 30))
        await Task.create({
          title: `Test Task ${i + 1}`,
          description: `This is a test task description ${i + 1}`,
          assignedTo: employee._id,
          assignedBy: teamLead._id,
          companyId: company._id,
          date,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          timeTracking: {},
        })
      }
      console.log("✓ Created tasks")
    }

    // Create notifications
    const notificationTypes = ["leave_approval", "announcement", "system", "message"] as const
    for (let i = 0; i < 20; i++) {
      const recipient = users[Math.floor(Math.random() * users.length)]
      await Notification.create({
        userId: recipient._id,
        companyId: company._id,
        title: `Test Notification ${i + 1}`,
        message: `This is a test notification message ${i + 1}`,
        type: notificationTypes[Math.floor(Math.random() * notificationTypes.length)],
        isRead: Math.random() > 0.5,
      })
    }
    console.log("✓ Created notifications")

    // Create salary configurations for employees
    let configCount = 0
    for (const employee of employees.slice(0, 10)) {
      const existingConfig = await SalaryConfiguration.findOne({ userId: employee._id })
      if (!existingConfig) {
        await SalaryConfiguration.create({
          userId: employee._id,
          companyId: company._id,
          salaryType: employee.salary.type,
          baseAmount: employee.salary.amount,
          currency: employee.salary.currency,
          overtimeEnabled: true,
          overtimeRate: 1.5,
          standardHoursPerDay: 8,
          standardDaysPerMonth: 22,
          deductions: [],
        })
        configCount++
      }
    }
    if (configCount > 0) {
      console.log(`✓ Created ${configCount} salary configurations`)
    }

    console.log("\n✅ Dummy data generation completed successfully!")
    console.log("\nTest Credentials:")
    console.log("  Primary Admin: test.admin@company.com / Test@123")
    console.log("  Secondary Admin: test.secondary@company.com / Test@123")
    console.log("  HR Manager: test.hr_manager0@company.com / Test@123")
    console.log("  Operations Manager: test.operations_manager0@company.com / Test@123")
    console.log("  Team Lead: test.team_lead0@company.com / Test@123")
    console.log("  Employee: test.employee0@company.com / Test@123")
    console.log("\nTotal users created:", users.length)
    console.log("Total attendance records:", await Attendance.countDocuments())
    console.log("Total leave applications:", await Leave.countDocuments())
    console.log("Total roster entries:", await Roster.countDocuments())
    console.log("Total tasks:", await Task.countDocuments())
    console.log("Total notifications:", await Notification.countDocuments())

    process.exit(0)
  } catch (error) {
    console.error("Error generating dummy data:", error)
    process.exit(1)
  }
}

generateDummyData()

