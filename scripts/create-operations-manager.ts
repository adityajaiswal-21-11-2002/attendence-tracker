/**
 * Create the test Operations Manager user
 * Run with: npx tsx scripts/create-operations-manager.ts
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

import connectDB from "../lib/mongodb"
import User from "../models/User"
import Company from "../models/Company"
import { hashPassword } from "../lib/auth"

async function createOperationsManager() {
  try {
    console.log("Connecting to database...")
    await connectDB()

    // Get or create test company
    let company = await Company.findOne({ email: "test@company.com" })
    if (!company) {
      console.log("Creating test company...")
      company = await Company.create({
        name: "Test Company Pvt Ltd",
        email: "test@company.com",
        phone: "+91-9876543210",
        address: "123 Test Street, Test City, Test State 123456",
        subscriptionPlan: "100_employees",
        subscriptionPrice: 20000,
        subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        isActive: true,
        createdBy: null,
      })
      console.log("✓ Test company created")
    } else {
      console.log("✓ Test company already exists")
    }

    // Check if user already exists
    const email = "test.operations_manager0@company.com"
    const existingUser = await User.findOne({ email })
    
    if (existingUser) {
      console.log(`✓ User ${email} already exists`)
      console.log(`  Name: ${existingUser.name}`)
      console.log(`  Role: ${existingUser.role}`)
      console.log(`  Company: ${company.name}`)
      process.exit(0)
    }

    // Create Operations Manager user
    console.log(`Creating Operations Manager user: ${email}...`)
    const hashedPassword = await hashPassword("Test@123")
    
    const user = await User.create({
      email,
      password: hashedPassword,
      name: "Test Operations Manager",
      phone: "+91-9876543212",
      role: "operations_manager",
      companyId: company._id,
      salary: {
        type: "fixed",
        amount: 65000,
        currency: "INR",
      },
      shiftTime: {
        start: "09:00",
        end: "18:00",
      },
      offDays: ["Saturday", "Sunday"],
      jobRole: "Operations Manager",
      isActive: true,
    })

    console.log("\n✅ Operations Manager user created successfully!")
    console.log("\nCredentials:")
    console.log(`  Email: ${user.email}`)
    console.log(`  Password: Test@123`)
    console.log(`  Name: ${user.name}`)
    console.log(`  Role: ${user.role}`)
    console.log(`  Company: ${company.name}`)

    process.exit(0)
  } catch (error) {
    console.error("❌ Error creating Operations Manager user:", error)
    process.exit(1)
  }
}

createOperationsManager()

