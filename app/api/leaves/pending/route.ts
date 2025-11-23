import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { canApproveLeaves } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Leave from "@/models/Leave"
import User from "@/models/User"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || !canApproveLeaves(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    let query: any = {
      companyId: user.companyId,
      status: "pending",
    }

    // Team leads can only see their team members' leaves
    if (user.role === "team_lead") {
      const teamMembers = await User.find({
        managerId: user.id,
        isActive: true,
      }).select("_id")

      const teamMemberIds = teamMembers.map((member) => member._id)
      query.userId = { $in: teamMemberIds }
    }

    const leaves = await Leave.find(query)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })

    return NextResponse.json({
      leaves: leaves.map((leave) => ({
        _id: leave._id,
        userId: leave.userId,
        leaveType: leave.leaveType,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        numberOfDays: leave.numberOfDays,
        reason: leave.reason,
        status: leave.status,
        createdAt: leave.createdAt,
      })),
    })
  } catch (error) {
    console.error("Error fetching pending leaves:", error)
    return NextResponse.json(
      { error: "Failed to fetch pending leaves" },
      { status: 500 }
    )
  }
}


