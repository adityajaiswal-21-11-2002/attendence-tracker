/**
 * Seed script for initializing database with default data
 * Run with: npx tsx scripts/seed.ts
 */

import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables FIRST before importing anything that uses them
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

import mongoose from "mongoose"
import connectDB from "../lib/mongodb"
import User from "../models/User"
import Company from "../models/Company"
import Holiday from "../models/Holiday"
import { hashPassword } from "../lib/auth"

async function seed() {
  try {
    console.log("Connecting to database...")
    await connectDB()

    // Create default primary admin company
    let company = await Company.findOne({ email: "admin@company.com" })

    if (!company) {
      console.log("Creating default company...")
      company = await Company.create({
        name: "Default Company",
        email: "admin@company.com",
        phone: "+1234567890",
        address: "123 Main St, City, Country",
        subscriptionPlan: "100_employees",
        subscriptionPrice: 20000,
        subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        isActive: true,
        createdBy: new mongoose.Types.ObjectId(), // Temporary ID
      })
      console.log("✓ Default company created")
    } else {
      console.log("✓ Default company already exists")
    }

    // Create default primary admin user
    const adminEmail = "admin@attendance-tracker.com"
    let admin = await User.findOne({ email: adminEmail })

    if (!admin) {
      console.log("Creating default admin user...")
      const hashedPassword = await hashPassword("Admin@123")
      admin = await User.create({
        email: adminEmail,
        password: hashedPassword,
        name: "System Administrator",
        phone: "+1234567890",
        role: "primary_admin",
        companyId: company._id,
        salary: {
          type: "fixed",
          amount: 0,
          currency: "INR",
        },
        shiftTime: {
          start: "09:00",
          end: "18:00",
        },
        offDays: ["Saturday", "Sunday"],
        jobRole: "Administrator",
        isActive: true,
      })
      console.log("✓ Default admin user created")
      console.log(`  Email: ${adminEmail}`)
      console.log(`  Password: Admin@123`)
      console.log("  ⚠️  Please change the password after first login!")
    } else {
      console.log("✓ Default admin user already exists")
    }

    // Update company createdBy if needed
    if (company.createdBy.toString() === new mongoose.Types.ObjectId().toString()) {
      company.createdBy = admin._id
      await company.save()
    }

    // Seed Indian holidays for current and next year
    console.log("Seeding holidays...")
    const currentYear = new Date().getFullYear()
    const nextYear = currentYear + 1

    const holidays = [
      // Fixed holidays
      { name: "New Year Day", date: new Date(currentYear, 0, 1), isNational: true },
      { name: "Republic Day", date: new Date(currentYear, 0, 26), isNational: true },
      { name: "Independence Day", date: new Date(currentYear, 7, 15), isNational: true },
      { name: "Gandhi Jayanti", date: new Date(currentYear, 9, 2), isNational: true },
      { name: "Christmas", date: new Date(currentYear, 11, 25), isNational: true },
      // Next year fixed holidays
      { name: "New Year Day", date: new Date(nextYear, 0, 1), isNational: true },
      { name: "Republic Day", date: new Date(nextYear, 0, 26), isNational: true },
      { name: "Independence Day", date: new Date(nextYear, 7, 15), isNational: true },
      { name: "Gandhi Jayanti", date: new Date(nextYear, 9, 2), isNational: true },
      { name: "Christmas", date: new Date(nextYear, 11, 25), isNational: true },
    ]

    // Add variable holidays (approximate dates - update annually)
    const variableHolidays: Record<number, Array<{ name: string; month: number; day: number }>> = {
      [currentYear]: [
        { name: "Holi", month: 2, day: 25 },
        { name: "Good Friday", month: 2, day: 29 },
        { name: "Buddha Purnima", month: 4, day: 23 },
        { name: "Muharram", month: 6, day: 17 },
        { name: "Durga Ashtami", month: 9, day: 12 },
        { name: "Dussehra", month: 9, day: 12 },
        { name: "Diwali", month: 10, day: 1 },
        { name: "Guru Nanak Jayanti", month: 10, day: 15 },
      ],
      [nextYear]: [
        { name: "Holi", month: 2, day: 14 },
        { name: "Good Friday", month: 3, day: 18 },
        { name: "Buddha Purnima", month: 4, day: 12 },
        { name: "Muharram", month: 6, day: 6 },
        { name: "Durga Ashtami", month: 9, day: 1 },
        { name: "Dussehra", month: 9, day: 2 },
        { name: "Diwali", month: 9, day: 20 },
        { name: "Guru Nanak Jayanti", month: 10, day: 5 },
      ],
    }

    for (const holiday of variableHolidays[currentYear] || []) {
      holidays.push({
        name: holiday.name,
        date: new Date(currentYear, holiday.month, holiday.day),
        isNational: true,
      })
    }

    for (const holiday of variableHolidays[nextYear] || []) {
      holidays.push({
        name: holiday.name,
        date: new Date(nextYear, holiday.month, holiday.day),
        isNational: true,
      })
    }

    // Insert holidays (skip duplicates)
    let insertedCount = 0
    for (const holiday of holidays) {
      const exists = await Holiday.findOne({ date: holiday.date })
      if (!exists) {
        await Holiday.create(holiday)
        insertedCount++
      }
    }

    console.log(`✓ ${insertedCount} new holidays added`)

    console.log("\n✅ Seeding completed successfully!")
    console.log("\nDefault Admin Credentials:")
    console.log(`  Email: ${adminEmail}`)
    console.log(`  Password: Admin@123`)
    console.log("\n⚠️  IMPORTANT: Change the default password after first login!")

    process.exit(0)
  } catch (error) {
    console.error("Error seeding database:", error)
    process.exit(1)
  }
}

seed()

