import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import { hashPassword } from "@/lib/auth"
import { z } from "zod"

const employeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(["hr_manager", "operations_manager", "team_lead", "employee"], {
    errorMap: () => ({ message: "Invalid role" }),
  }),
  jobRole: z.string().min(1, "Job role is required"),
  managerId: z.string().nullable().optional(),
  salary: z.object({
    type: z.enum(["fixed", "hourly", "commission"], {
      errorMap: () => ({ message: "Invalid salary type" }),
    }),
    amount: z.number().min(0, "Salary amount must be non-negative"),
    currency: z.string().default("INR"),
  }),
  shiftTime: z.object({
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  }),
  offDays: z.array(z.string()).default([]),
}).strict() // Reject unknown fields

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (
      !user ||
      (user.role !== "secondary_admin" &&
        user.role !== "hr_manager" &&
        user.role !== "primary_admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const employees = await User.find({
      companyId: user.companyId,
      role: { $ne: "secondary_admin" },
    })
      .populate("managerId", "name role")
      .select("-password")
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ employees })
  } catch (error) {
    console.error("Error fetching employees:", error)
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (
      !user ||
      (user.role !== "secondary_admin" && user.role !== "hr_manager" && user.role !== "primary_admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request body - this will catch missing fields, invalid types, etc.
    let validatedData
    try {
      validatedData = employeeSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation error", details: error.errors },
          { status: 400 }
        )
      }
      throw error
    }

    if (!validatedData.password) {
      return NextResponse.json(
        { error: "Password is required for new employees" },
        { status: 400 }
      )
    }

    await connectDB()

    // Check if user already exists
    const existingUser = await User.findOne({ email: validatedData.email })
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Verify manager belongs to same company
    if (validatedData.managerId) {
      const manager = await User.findOne({
        _id: validatedData.managerId,
        companyId: user.companyId,
      })
      if (!manager) {
        return NextResponse.json(
          { error: "Invalid manager selected" },
          { status: 400 }
        )
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password)

    // Create employee
    const employee = await User.create({
      name: validatedData.name,
      email: validatedData.email,
      phone: validatedData.phone,
      password: hashedPassword,
      role: validatedData.role,
      companyId: user.companyId,
      managerId: validatedData.managerId || null,
      jobRole: validatedData.jobRole,
      salary: validatedData.salary,
      shiftTime: validatedData.shiftTime,
      offDays: validatedData.offDays,
      isActive: true,
    })

    const employeeObj = employee.toObject()
    delete employeeObj.password

    return NextResponse.json({ employee: employeeObj }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating employee:", error)
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    )
  }
}

