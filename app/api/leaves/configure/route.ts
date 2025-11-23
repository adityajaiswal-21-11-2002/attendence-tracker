import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import LeaveBalance from "@/models/LeaveBalance"
import User from "@/models/User"

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (
      !user ||
      (user.role !== "hr_manager" &&
        user.role !== "primary_admin" &&
        user.role !== "secondary_admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      userId,
      year,
      earnedLeave,
      sickLeave,
      compOff,
      casualLeave,
    } = body

    if (!userId || !year) {
      return NextResponse.json(
        { error: "User ID and year are required" },
        { status: 400 }
      )
    }

    await connectDB()

    const targetUser = await User.findById(userId)
    if (!targetUser || targetUser.companyId.toString() !== user.companyId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const leaveBalance = await LeaveBalance.findOneAndUpdate(
      {
        userId,
        companyId: user.companyId,
        year,
      },
      {
        earnedLeave: earnedLeave ?? 0,
        sickLeave: sickLeave ?? 0,
        compOff: compOff ?? 0,
        casualLeave: casualLeave ?? 0,
      },
      { upsert: true, new: true }
    )

    return NextResponse.json({
      message: "Leave balance configured successfully",
      leaveBalance: {
        _id: leaveBalance._id,
        userId: leaveBalance.userId,
        year: leaveBalance.year,
        earnedLeave: leaveBalance.earnedLeave,
        sickLeave: leaveBalance.sickLeave,
        compOff: leaveBalance.compOff,
        casualLeave: leaveBalance.casualLeave,
      },
    })
  } catch (error) {
    console.error("Error configuring leave balance:", error)
    return NextResponse.json(
      { error: "Failed to configure leave balance" },
      { status: 500 }
    )
  }
}


