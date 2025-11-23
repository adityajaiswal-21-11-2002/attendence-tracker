import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Company from "@/models/Company"
import { hashPassword } from "@/lib/auth"
import { z } from "zod"

const adminSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  companyId: z.string().min(1, "Company ID is required"),
})

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== "primary_admin" && user.role !== "secondary_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const admins = await User.find({
      role: "secondary_admin",
    })
      .populate("companyId", "name")
      .select("-password")
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ admins })
  } catch (error) {
    console.error("Error fetching admins:", error)
    return NextResponse.json(
      { error: "Failed to fetch admins" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "primary_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = adminSchema.parse(body)

    if (!validatedData.password) {
      return NextResponse.json(
        { error: "Password is required for new admins" },
        { status: 400 }
      )
    }

    await connectDB()

    // Check if company exists
    const company = await Company.findById(validatedData.companyId)
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: validatedData.email })
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password)

    // Create secondary admin
    const admin = await User.create({
      name: validatedData.name,
      email: validatedData.email,
      password: hashedPassword,
      role: "secondary_admin",
      companyId: validatedData.companyId,
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
      jobRole: "Secondary Administrator",
      isActive: true,
    })

    return NextResponse.json(
      { admin: { ...admin.toObject(), password: undefined } },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating admin:", error)
    return NextResponse.json(
      { error: "Failed to create admin" },
      { status: 500 }
    )
  }
}

