import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import LeaveBalance from "@/models/LeaveBalance"
import User from "@/models/User"

export async function PUT(request: Request) {
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

    const leaveBalance = await LeaveBalance.findOne({
      userId,
      companyId: user.companyId,
      year,
    })

    if (!leaveBalance) {
      return NextResponse.json(
        { error: "Leave balance not found" },
        { status: 404 }
      )
    }

    // Update balances (add to existing)
    if (earnedLeave !== undefined) {
      leaveBalance.earnedLeave = Math.max(0, leaveBalance.earnedLeave + earnedLeave)
    }
    if (sickLeave !== undefined) {
      leaveBalance.sickLeave = Math.max(0, leaveBalance.sickLeave + sickLeave)
    }
    if (compOff !== undefined) {
      leaveBalance.compOff = Math.max(0, leaveBalance.compOff + compOff)
    }
    if (casualLeave !== undefined) {
      leaveBalance.casualLeave = Math.max(0, leaveBalance.casualLeave + casualLeave)
    }

    await leaveBalance.save()

    return NextResponse.json({
      message: "Leave balance updated successfully",
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
    console.error("Error updating leave balance:", error)
    return NextResponse.json(
      { error: "Failed to update leave balance" },
      { status: 500 }
    )
  }
}


