import { NextResponse } from "next/server"
import { z } from "zod"
import connectDB from "@/lib/mongodb"
import Company from "@/models/Company"
import User from "@/models/User"
import { hashPassword } from "@/lib/auth"

const registerSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyEmail: z.string().email("Invalid email address"),
  companyPhone: z.string().optional(),
  companyAddress: z.string().optional(),
  subscriptionPlan: z.enum(["10_employees", "50_employees", "100_employees"]),
  adminName: z.string().min(1, "Admin name is required"),
  adminEmail: z.string().email("Invalid email address"),
  adminPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = registerSchema.parse(body)

    await connectDB()

    // Check if company email already exists
    const existingCompany = await Company.findOne({
      email: validatedData.companyEmail,
    })

    if (existingCompany) {
      return NextResponse.json(
        { error: "Company with this email already exists" },
        { status: 400 }
      )
    }

    // Check if admin email already exists
    const existingUser = await User.findOne({
      email: validatedData.adminEmail,
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Calculate subscription expiry (1 year from now)
    const subscriptionExpiry = new Date()
    subscriptionExpiry.setFullYear(subscriptionExpiry.getFullYear() + 1)

    // Determine subscription price based on plan
    const subscriptionPrices: Record<string, number> = {
      "10_employees": 4000,
      "50_employees": 10000,
      "100_employees": 20000,
    }

    // Create company
    const company = await Company.create({
      name: validatedData.companyName,
      email: validatedData.companyEmail,
      phone: validatedData.companyPhone,
      address: validatedData.companyAddress,
      subscriptionPlan: validatedData.subscriptionPlan,
      subscriptionPrice: subscriptionPrices[validatedData.subscriptionPlan],
      subscriptionExpiry,
      isActive: true,
      createdBy: null, // Will be updated after user creation
    })

    // Hash password
    const hashedPassword = await hashPassword(validatedData.adminPassword)

    // Create primary admin user
    const admin = await User.create({
      name: validatedData.adminName,
      email: validatedData.adminEmail,
      password: hashedPassword,
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
      jobRole: "Primary Administrator",
      isActive: true,
    })

    // Update company with createdBy
    company.createdBy = admin._id
    await company.save()

    return NextResponse.json(
      {
        message: "Company and admin account created successfully",
        companyId: company._id,
        userId: admin._id,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    )
  }
}

