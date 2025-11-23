import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Company from "@/models/Company"
import { z } from "zod"

const subscriptionSchema = z.object({
  subscriptionPlan: z.enum(["10_employees", "50_employees", "100_employees"]).optional(),
  subscriptionPrice: z.number().min(0).optional(),
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
    const validatedData = subscriptionSchema.parse(body)

    await connectDB()

    const company = await Company.findById(params.id)

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    // Update subscription plan and price
    if (validatedData.subscriptionPlan) {
      company.subscriptionPlan = validatedData.subscriptionPlan
      const subscriptionPrices: Record<string, number> = {
        "10_employees": 4000,
        "50_employees": 10000,
        "100_employees": 20000,
      }
      company.subscriptionPrice = validatedData.subscriptionPrice || subscriptionPrices[validatedData.subscriptionPlan]
    } else if (validatedData.subscriptionPrice) {
      company.subscriptionPrice = validatedData.subscriptionPrice
    }

    await company.save()

    return NextResponse.json({ company })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating subscription:", error)
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    )
  }
}

