import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "secondary_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const managers = await User.find({
      companyId: user.companyId,
      role: { $in: ["hr_manager", "operations_manager", "team_lead"] },
      isActive: true,
    })
      .select("name role")
      .lean()

    return NextResponse.json({ managers })
  } catch (error) {
    console.error("Error fetching managers:", error)
    return NextResponse.json(
      { error: "Failed to fetch managers" },
      { status: 500 }
    )
  }
}

