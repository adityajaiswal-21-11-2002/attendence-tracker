import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Company from "@/models/Company"
import { z } from "zod"

const companySchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  subscriptionPlan: z.enum(["10_employees", "50_employees", "100_employees"]).optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "primary_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = companySchema.parse(body)

    await connectDB()

    const company = await Company.findById(params.id)

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    // Update subscription price if plan changed
    if (validatedData.subscriptionPlan && validatedData.subscriptionPlan !== company.subscriptionPlan) {
      const subscriptionPrices: Record<string, number> = {
        "10_employees": 4000,
        "50_employees": 10000,
        "100_employees": 20000,
      }
      validatedData.subscriptionPrice = subscriptionPrices[validatedData.subscriptionPlan]
    }

    Object.assign(company, validatedData)
    await company.save()

    return NextResponse.json({ company })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating company:", error)
    return NextResponse.json(
      { error: "Failed to update company" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "primary_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const company = await Company.findByIdAndDelete(params.id)

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Company deleted successfully" })
  } catch (error) {
    console.error("Error deleting company:", error)
    return NextResponse.json(
      { error: "Failed to delete company" },
      { status: 500 }
    )
  }
}

