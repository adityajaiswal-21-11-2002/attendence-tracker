import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import SalaryConfiguration from "@/models/SalaryConfiguration"
import User from "@/models/User"
import { z } from "zod"

const deductionSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["fixed", "percentage"]),
  amount: z.number().min(0),
  isActive: z.boolean().default(true),
})

const salaryConfigSchema = z.object({
  userId: z.string().min(1),
  salaryType: z.enum(["fixed", "hourly", "commission"]),
  baseAmount: z.number().min(0),
  currency: z.string().default("INR"),
  deductions: z.array(deductionSchema).default([]),
  overtimeEnabled: z.boolean().default(false),
  overtimeRate: z.number().min(1).default(1.5),
  standardHoursPerDay: z.number().min(1).max(24).default(8),
  standardDaysPerMonth: z.number().min(1).max(31).default(22),
})

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (
      !user ||
      (user.role !== "hr_manager" &&
        user.role !== "primary_admin" &&
        user.role !== "secondary_admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const configurations = await SalaryConfiguration.find({
      companyId: user.companyId,
    })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })

    return NextResponse.json({
      configurations: configurations.map((config) => ({
        _id: config._id,
        userId: config.userId,
        salaryType: config.salaryType,
        baseAmount: config.baseAmount,
        currency: config.currency,
        deductions: config.deductions,
        overtimeEnabled: config.overtimeEnabled,
        overtimeRate: config.overtimeRate,
        standardHoursPerDay: config.standardHoursPerDay,
        standardDaysPerMonth: config.standardDaysPerMonth,
      })),
    })
  } catch (error) {
    console.error("Error fetching salary configurations:", error)
    return NextResponse.json(
      { error: "Failed to fetch salary configurations" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (
      !user ||
      (user.role !== "hr_manager" &&
        user.role !== "primary_admin" &&
        user.role !== "secondary_admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = salaryConfigSchema.parse(body)

    await connectDB()

    // Verify employee belongs to company
    const employee = await User.findById(validatedData.userId)
    if (!employee || employee.companyId.toString() !== user.companyId) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Create or update configuration
    const configuration = await SalaryConfiguration.findOneAndUpdate(
      { userId: validatedData.userId, companyId: user.companyId },
      {
        userId: validatedData.userId,
        companyId: user.companyId,
        salaryType: validatedData.salaryType,
        baseAmount: validatedData.baseAmount,
        currency: validatedData.currency,
        deductions: validatedData.deductions,
        overtimeEnabled: validatedData.overtimeEnabled,
        overtimeRate: validatedData.overtimeRate,
        standardHoursPerDay: validatedData.standardHoursPerDay,
        standardDaysPerMonth: validatedData.standardDaysPerMonth,
      },
      { upsert: true, new: true }
    )

    return NextResponse.json({
      message: "Salary configuration saved successfully",
      configuration: {
        _id: configuration._id,
        userId: configuration.userId,
        salaryType: configuration.salaryType,
        baseAmount: configuration.baseAmount,
        currency: configuration.currency,
        deductions: configuration.deductions,
        overtimeEnabled: configuration.overtimeEnabled,
        overtimeRate: configuration.overtimeRate,
        standardHoursPerDay: configuration.standardHoursPerDay,
        standardDaysPerMonth: configuration.standardDaysPerMonth,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error saving salary configuration:", error)
    return NextResponse.json(
      { error: "Failed to save salary configuration" },
      { status: 500 }
    )
  }
}

