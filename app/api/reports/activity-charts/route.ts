import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Attendance from "@/models/Attendance"
import Leave from "@/models/Leave"
import Payslip from "@/models/Payslip"
import User from "@/models/User"
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (
      !user ||
      (user.role !== "primary_admin" &&
        user.role !== "secondary_admin" &&
        user.role !== "operations_manager" &&
        user.role !== "team_lead")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      )
    }

    const start = parseISO(startDate)
    const end = parseISO(endDate)

    // Build user query
    let userQuery: any = {
      companyId: user.companyId,
      isActive: true,
    }

    if (user.role === "team_lead") {
      userQuery.managerId = user.id
    }

    const employees = await User.find(userQuery).select("_id")
    const employeeIds = employees.map((e) => e._id)

    // Get monthly data
    const months = eachMonthOfInterval({ start, end })
    const attendanceTrends = []
    const leaveDistribution = {
      earned: 0,
      sick: 0,
      comp_off: 0,
      casual: 0,
    }
    const departmentPerformance: Record<string, { present: number; absent: number }> = {}
    const hourlyDistribution: Record<number, number> = {}

    for (const month of months) {
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)

      // Attendance data
      const attendanceRecords = await Attendance.find({
        userId: { $in: employeeIds },
        date: { $gte: monthStart, $lte: monthEnd },
      })

      const presentCount = attendanceRecords.filter((a) => a.status === "present").length
      const absentCount = attendanceRecords.filter((a) => a.status === "absent").length
      const halfDayCount = attendanceRecords.filter((a) => a.status === "half_day").length

      attendanceTrends.push({
        month: format(month, "MMM yyyy"),
        present: presentCount,
        absent: absentCount,
        halfDay: halfDayCount,
        total: presentCount + absentCount + halfDayCount,
      })

      // Hourly distribution (peak working hours)
      attendanceRecords.forEach((record) => {
        if (record.loginTime) {
          const hour = new Date(record.loginTime).getHours()
          hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1
        }
      })
    }

    // Leave distribution
    const leaves = await Leave.find({
      userId: { $in: employeeIds },
      status: "approved",
      fromDate: { $gte: start },
      toDate: { $lte: end },
    })

    leaves.forEach((leave) => {
      leaveDistribution[leave.leaveType as keyof typeof leaveDistribution] += leave.numberOfDays
    })

    // Department performance
    const allAttendance = await Attendance.find({
      userId: { $in: employeeIds },
      date: { $gte: start, $lte: end },
    }).populate("userId", "role")

    allAttendance.forEach((record) => {
      const employee = record.userId as any
      const role = employee.role || "employee"

      if (!departmentPerformance[role]) {
        departmentPerformance[role] = { present: 0, absent: 0 }
      }

      if (record.status === "present") {
        departmentPerformance[role].present++
      } else if (record.status === "absent") {
        departmentPerformance[role].absent++
      }
    })

    // Convert hourly distribution to array
    const peakHours = Object.entries(hourlyDistribution)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Department performance array
    const deptPerfArray = Object.entries(departmentPerformance).map(([role, data]) => ({
      department: role,
      present: data.present,
      absent: data.absent,
      percentage: ((data.present / (data.present + data.absent)) * 100).toFixed(2),
    }))

    return NextResponse.json({
      charts: {
        attendanceTrends,
        leaveDistribution: Object.entries(leaveDistribution).map(([type, count]) => ({
          type,
          count,
        })),
        departmentPerformance: deptPerfArray,
        peakHours,
      },
    })
  } catch (error) {
    console.error("Error generating activity charts:", error)
    return NextResponse.json(
      { error: "Failed to generate activity charts" },
      { status: 500 }
    )
  }
}

