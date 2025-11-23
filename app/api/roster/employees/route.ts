import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (
      !user ||
      (user.role !== "operations_manager" && user.role !== "team_lead")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // Get employees based on role
    let query: any = {
      companyId: user.companyId,
      isActive: true,
    }

    // Team Lead can only see their team members
    if (user.role === "team_lead") {
      query.managerId = user.id
    }

    const employees = await User.find(query)
      .select("name email role jobRole")
      .sort({ name: 1 })
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

