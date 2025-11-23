import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Attendance from "@/models/Attendance"
import Leave from "@/models/Leave"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "secondary_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // Total employees
    const totalEmployees = await User.countDocuments({
      companyId: user.companyId,
      role: { $ne: "secondary_admin" },
      isActive: true,
    })

    // Today's attendance
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayAttendance = await Attendance.countDocuments({
      companyId: user.companyId,
      date: { $gte: today, $lt: tomorrow },
      status: "present",
    })

    const todayAbsent = await Attendance.countDocuments({
      companyId: user.companyId,
      date: { $gte: today, $lt: tomorrow },
      status: "absent",
    })

    // Pending leave requests
    const pendingLeaves = await Leave.countDocuments({
      companyId: user.companyId,
      status: "pending",
    })

    return NextResponse.json({
      totalEmployees,
      todayAttendance,
      todayAbsent,
      pendingLeaves,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    )
  }
}

