import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Leave from "@/models/Leave"
import LeaveBalance from "@/models/LeaveBalance"
import Holiday from "@/models/Holiday"
import User from "@/models/User"
import { format, differenceInDays, isWeekend, parseISO } from "date-fns"
import { notifyManagerLeaveRequest } from "@/lib/notifications"

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "employee") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { leaveType, fromDate, toDate, reason } = body

    if (!leaveType || !fromDate || !toDate || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    await connectDB()

    const from = parseISO(fromDate)
    const to = parseISO(toDate)

    if (from > to) {
      return NextResponse.json(
        { error: "From date must be before or equal to to date" },
        { status: 400 }
      )
    }

    // Calculate number of days excluding weekends and holidays
    let numberOfDays = 0
    const holidays = await Holiday.find({
      date: {
        $gte: new Date(from.getFullYear(), from.getMonth(), from.getDate()),
        $lte: new Date(to.getFullYear(), to.getMonth(), to.getDate()),
      },
    })

    const holidayDates = holidays.map((h) =>
      format(new Date(h.date), "yyyy-MM-dd")
    )

    let currentDate = new Date(from)
    while (currentDate <= to) {
      const dateStr = format(currentDate, "yyyy-MM-dd")
      const dayOfWeek = currentDate.getDay()

      // Count only weekdays that are not holidays
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.includes(dateStr)) {
        numberOfDays++
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    if (numberOfDays === 0) {
      return NextResponse.json(
        { error: "No working days in the selected date range" },
        { status: 400 }
      )
    }

    // Check leave balance
    const currentYear = new Date().getFullYear()
    const leaveBalance = await LeaveBalance.findOne({
      userId: user.id,
      companyId: user.companyId,
      year: currentYear,
    })

    if (!leaveBalance) {
      return NextResponse.json(
        { error: "Leave balance not found. Please contact HR." },
        { status: 400 }
      )
    }

    // Check available balance
    let availableBalance = 0
    switch (leaveType) {
      case "earned":
        availableBalance = leaveBalance.earnedLeave
        break
      case "sick":
        availableBalance = leaveBalance.sickLeave
        break
      case "comp_off":
        availableBalance = leaveBalance.compOff
        break
      case "casual":
        availableBalance = leaveBalance.casualLeave
        break
    }

    if (availableBalance < numberOfDays) {
      return NextResponse.json(
        {
          error: `Insufficient leave balance. Available: ${availableBalance} days, Required: ${numberOfDays} days`,
        },
        { status: 400 }
      )
    }

    // Check for overlapping leave requests
    const overlappingLeave = await Leave.findOne({
      userId: user.id,
      status: { $in: ["pending", "approved"] },
      $or: [
        {
          fromDate: { $lte: to },
          toDate: { $gte: from },
        },
      ],
    })

    if (overlappingLeave) {
      return NextResponse.json(
        {
          error: "You already have a leave request for this date range",
        },
        { status: 400 }
      )
    }

    // Create leave request
    const leave = await Leave.create({
      userId: user.id,
      companyId: user.companyId,
      leaveType,
      fromDate: from,
      toDate: to,
      numberOfDays,
      reason,
      status: "pending",
    })

    // Notify manager about the leave request
    const employee = await User.findById(user.id)
    if (employee && employee.managerId) {
      await notifyManagerLeaveRequest(
        employee.managerId.toString(),
        user.companyId,
        employee.name,
        {
          leaveType,
          fromDate: from,
          toDate: to,
          numberOfDays,
        }
      )
    }

    return NextResponse.json(
      {
        message: "Leave request submitted successfully",
        leave: {
          _id: leave._id,
          leaveType: leave.leaveType,
          fromDate: leave.fromDate,
          toDate: leave.toDate,
          numberOfDays: leave.numberOfDays,
          reason: leave.reason,
          status: leave.status,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error applying for leave:", error)
    return NextResponse.json(
      { error: "Failed to submit leave request" },
      { status: 500 }
    )
  }
}


