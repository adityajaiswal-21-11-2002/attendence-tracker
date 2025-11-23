import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Company from "@/models/Company"
import { z } from "zod"

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  subscriptionPlan: z.enum(["10_employees", "50_employees", "100_employees"]),
})

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== "primary_admin" && user.role !== "secondary_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const companies = await Company.find().sort({ createdAt: -1 }).lean()

    return NextResponse.json({ companies })
  } catch (error) {
    console.error("Error fetching companies:", error)
    return NextResponse.json(
      { error: "Failed to fetch companies" },
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
    const validatedData = companySchema.parse(body)

    await connectDB()

    // Check if company email already exists
    const existingCompany = await Company.findOne({
      email: validatedData.email,
    })

    if (existingCompany) {
      return NextResponse.json(
        { error: "Company with this email already exists" },
        { status: 400 }
      )
    }

    // Calculate subscription expiry (1 year from now)
    const subscriptionExpiry = new Date()
    subscriptionExpiry.setFullYear(subscriptionExpiry.getFullYear() + 1)

    // Determine subscription price
    const subscriptionPrices: Record<string, number> = {
      "10_employees": 4000,
      "50_employees": 10000,
      "100_employees": 20000,
    }

    const company = await Company.create({
      ...validatedData,
      subscriptionPrice: subscriptionPrices[validatedData.subscriptionPlan],
      subscriptionExpiry,
      isActive: true,
      createdBy: user.id,
    })

    return NextResponse.json({ company }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating company:", error)
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    )
  }
}

