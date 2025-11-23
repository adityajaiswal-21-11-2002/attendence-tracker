import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Leave from "@/models/Leave"
import User from "@/models/User"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || user.id
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : new Date().getFullYear()

    // Check if user can view other users' leaves
    if (userId !== user.id) {
      const canView =
        user.role === "primary_admin" ||
        user.role === "secondary_admin" ||
        user.role === "hr_manager" ||
        user.role === "operations_manager" ||
        (user.role === "team_lead" &&
          (await User.findOne({ _id: userId, managerId: user.id })))

      if (!canView) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }
    }

    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31, 23, 59, 59)

    const leaves = await Leave.find({
      userId,
      fromDate: { $gte: startDate, $lte: endDate },
    })
      .populate("approvedBy", "name email")
      .sort({ fromDate: -1 })

    return NextResponse.json({
      leaves: leaves.map((leave) => ({
        _id: leave._id,
        leaveType: leave.leaveType,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        numberOfDays: leave.numberOfDays,
        reason: leave.reason,
        status: leave.status,
        approvedBy: leave.approvedBy
          ? {
              name: (leave.approvedBy as any).name,
              email: (leave.approvedBy as any).email,
            }
          : null,
        comments: leave.comments,
        createdAt: leave.createdAt,
        updatedAt: leave.updatedAt,
      })),
    })
  } catch (error) {
    console.error("Error fetching leave history:", error)
    return NextResponse.json(
      { error: "Failed to fetch leave history" },
      { status: 500 }
    )
  }
}


