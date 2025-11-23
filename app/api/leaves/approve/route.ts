import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { canApproveLeaves } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Leave from "@/models/Leave"
import LeaveBalance from "@/models/LeaveBalance"
import User from "@/models/User"
import { notifyLeaveStatus } from "@/lib/notifications"

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user || !canApproveLeaves(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { leaveId, comments } = body

    if (!leaveId) {
      return NextResponse.json(
        { error: "Leave ID is required" },
        { status: 400 }
      )
    }

    await connectDB()

    const leave = await Leave.findById(leaveId).populate("userId", "name email companyId")

    if (!leave) {
      return NextResponse.json({ error: "Leave not found" }, { status: 404 })
    }

    // Check if user can approve this leave - verify company match
    if (leave.companyId.toString() !== user.companyId.toString()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Check if user is manager of the employee (for team_lead)
    if (user.role === "team_lead") {
      const employee = await User.findById(leave.userId)
      if (!employee || employee.managerId?.toString() !== user.id) {
        return NextResponse.json(
          { error: "You can only approve leaves for your team members" },
          { status: 403 }
        )
      }
    }

    if (leave.status !== "pending") {
      return NextResponse.json(
        { error: "Leave request is not pending" },
        { status: 400 }
      )
    }

    // Update leave status
    leave.status = "approved"
    leave.approvedBy = user.id
    if (comments) {
      leave.comments = comments
    }
    await leave.save()

    // Deduct from leave balance
    const currentYear = new Date(leave.fromDate).getFullYear()
    const leaveBalance = await LeaveBalance.findOne({
      userId: leave.userId,
      companyId: leave.companyId,
      year: currentYear,
    })

    if (leaveBalance) {
      switch (leave.leaveType) {
        case "earned":
          leaveBalance.earnedLeave -= leave.numberOfDays
          break
        case "sick":
          leaveBalance.sickLeave -= leave.numberOfDays
          break
        case "comp_off":
          leaveBalance.compOff -= leave.numberOfDays
          break
        case "casual":
          leaveBalance.casualLeave -= leave.numberOfDays
          break
      }
      await leaveBalance.save()
    }

    // Send notification to employee
    const leaveUser = leave.userId as any
    await notifyLeaveStatus(
      leaveUser._id.toString(),
      leave.companyId.toString(),
      "approved",
      {
        leaveType: leave.leaveType,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        numberOfDays: leave.numberOfDays,
        comments: leave.comments,
      }
    )

    return NextResponse.json({
      message: "Leave approved successfully",
      leave: {
        _id: leave._id,
        status: leave.status,
        approvedBy: leave.approvedBy,
        comments: leave.comments,
      },
    })
  } catch (error) {
    console.error("Error approving leave:", error)
    return NextResponse.json(
      { error: "Failed to approve leave" },
      { status: 500 }
    )
  }
}


