import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Attendance from "@/models/Attendance"
import { startOfDay, endOfDay, differenceInHours } from "date-fns"

export async function POST() {
  try {
    const user = await getCurrentUser()

    // Explicitly check for authentication
    if (!user || !user.id || !user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const today = new Date()
    const dayStart = startOfDay(today)
    const dayEnd = endOfDay(today)

    const attendance = await Attendance.findOne({
      userId: user.id,
      companyId: user.companyId,
      date: {
        $gte: dayStart,
        $lte: dayEnd,
      },
    })

    if (!attendance || !attendance.loginTime) {
      return NextResponse.json(
        { error: "Not logged in" },
        { status: 400 }
      )
    }

    if (attendance.logoutTime) {
      return NextResponse.json(
        { error: "Already logged out" },
        { status: 400 }
      )
    }

    // Close any open breaks
    const openBreaks = attendance.breaks.filter((b) => !b.breakOut)
    for (const breakItem of openBreaks) {
      breakItem.breakOut = new Date()
    }

    attendance.logoutTime = new Date()

    // Calculate total hours
    const loginTime = new Date(attendance.loginTime)
    const logoutTime = attendance.logoutTime
    const totalMinutes =
      (logoutTime.getTime() - loginTime.getTime()) / (1000 * 60)

    // Subtract break durations
    let totalBreakMinutes = 0
    attendance.breaks.forEach((breakItem) => {
      if (breakItem.breakOut) {
        const breakDuration =
          (breakItem.breakOut.getTime() - breakItem.breakIn.getTime()) /
          (1000 * 60)
        totalBreakMinutes += breakDuration
      }
    })

    const workMinutes = totalMinutes - totalBreakMinutes
    attendance.totalHours = workMinutes / 60

    await attendance.save()

    return NextResponse.json({ attendance })
  } catch (error) {
    console.error("Error logging out:", error)
    return NextResponse.json(
      { error: "Failed to log out" },
      { status: 500 }
    )
  }
}

