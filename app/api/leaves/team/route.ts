import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { canApproveLeaves } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Leave from "@/models/Leave"
import User from "@/models/User"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user || !canApproveLeaves(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : new Date().getFullYear()

    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31, 23, 59, 59)

    let userIds: any[] = []

    if (user.role === "team_lead") {
      const teamMembers = await User.find({
        managerId: user.id,
        isActive: true,
      }).select("_id")
      userIds = teamMembers.map((member) => member._id)
    } else {
      // For HR and Operations managers, get all employees in company
      const employees = await User.find({
        companyId: user.companyId,
        role: "employee",
        isActive: true,
      }).select("_id")
      userIds = employees.map((emp) => emp._id)
    }

    const leaves = await Leave.find({
      userId: { $in: userIds },
      fromDate: { $gte: startDate, $lte: endDate },
    })
      .populate("userId", "name email")
      .sort({ fromDate: -1 })

    return NextResponse.json({
      leaves: leaves.map((leave) => ({
        _id: leave._id,
        userId: leave.userId,
        leaveType: leave.leaveType,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        numberOfDays: leave.numberOfDays,
        reason: leave.reason || "",
        status: leave.status,
        createdAt: leave.createdAt,
      })),
    })
  } catch (error) {
    console.error("Error fetching team leaves:", error)
    return NextResponse.json(
      { error: "Failed to fetch team leaves" },
      { status: 500 }
    )
  }
}


