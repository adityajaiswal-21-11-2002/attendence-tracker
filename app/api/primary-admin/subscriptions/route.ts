import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Company from "@/models/Company"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== "primary_admin" && user.role !== "secondary_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const subscriptions = await Company.find()
      .select("name email subscriptionPlan subscriptionPrice subscriptionExpiry isActive")
      .sort({ subscriptionExpiry: 1 })
      .lean()

    // Transform data to include company info
    const formattedSubscriptions = subscriptions.map((sub: any) => ({
      _id: sub._id,
      companyId: {
        _id: sub._id,
        name: sub.name,
        email: sub.email,
      },
      subscriptionPlan: sub.subscriptionPlan,
      subscriptionPrice: sub.subscriptionPrice,
      subscriptionExpiry: sub.subscriptionExpiry,
      isActive: sub.isActive,
    }))

    return NextResponse.json({ subscriptions: formattedSubscriptions })
  } catch (error) {
    console.error("Error fetching subscriptions:", error)
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    )
  }
}

