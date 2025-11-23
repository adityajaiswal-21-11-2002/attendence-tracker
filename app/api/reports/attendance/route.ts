import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Attendance from "@/models/Attendance"
import User from "@/models/User"
import Leave from "@/models/Leave"
import { format, parseISO, startOfDay, endOfDay, eachDayOfInterval, isWeekend } from "date-fns"
import { z } from "zod"

const reportSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  department: z.string().optional(),
  role: z.string().optional(),
  userIds: z.array(z.string()).optional(),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (
      !user ||
      (user.role !== "primary_admin" &&
        user.role !== "secondary_admin" &&
        user.role !== "hr_manager" &&
        user.role !== "operations_manager" &&
        user.role !== "team_lead")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = reportSchema.parse(body)

    await connectDB()

    const startDate = startOfDay(parseISO(validatedData.startDate))
    const endDate = endOfDay(parseISO(validatedData.endDate))

    // Build user query
    let userQuery: any = {
      companyId: user.companyId,
      isActive: true,
    }

    // Team leads can only see their team
    if (user.role === "team_lead") {
      userQuery.managerId = user.id
    }

    if (validatedData.userIds && validatedData.userIds.length > 0) {
      userQuery._id = { $in: validatedData.userIds }
    }

    if (validatedData.role && validatedData.role !== "all") {
      userQuery.role = validatedData.role
    }

    const employees = await User.find(userQuery).select("name email role jobRole managerId")

    const reportData = []

    for (const employee of employees) {
      // Get attendance records
      const attendanceRecords = await Attendance.find({
        userId: employee._id,
        date: { $gte: startDate, $lte: endDate },
      }).sort({ date: 1 })

      // Get approved leaves
      const leaves = await Leave.find({
        userId: employee._id,
        status: "approved",
        fromDate: { $lte: endDate },
        toDate: { $gte: startDate },
      })

      // Calculate statistics
      let presentDays = 0
      let absentDays = 0
      let halfDays = 0
      let leaveDays = 0
      let totalHours = 0
      let lateArrivals = 0
      let earlyDepartures = 0
      let totalWorkingDays = 0

      // Get employee shift time
      const shiftStart = employee.shiftTime?.start || "09:00"
      const [shiftHour, shiftMinute] = shiftStart.split(":").map(Number)

      // Process each day in range
      const allDays = eachDayOfInterval({ start: startDate, end: endDate })
      for (const day of allDays) {
        if (isWeekend(day)) continue

        totalWorkingDays++
        const dayStr = format(day, "yyyy-MM-dd")

        // Check if there's a leave for this day
        const hasLeave = leaves.some((leave) => {
          const leaveStart = format(new Date(leave.fromDate), "yyyy-MM-dd")
          const leaveEnd = format(new Date(leave.toDate), "yyyy-MM-dd")
          return dayStr >= leaveStart && dayStr <= leaveEnd
        })

        if (hasLeave) {
          leaveDays++
          continue
        }

        const attendance = attendanceRecords.find(
          (a) => format(new Date(a.date), "yyyy-MM-dd") === dayStr
        )

        if (!attendance) {
          absentDays++
          continue
        }

        switch (attendance.status) {
          case "present":
            presentDays++
            totalHours += attendance.totalHours || 0

            // Check for late arrival
            if (attendance.loginTime) {
              const loginTime = new Date(attendance.loginTime)
              const expectedLogin = new Date(day)
              expectedLogin.setHours(shiftHour, shiftMinute, 0, 0)

              if (loginTime > expectedLogin) {
                lateArrivals++
              }
            }

            // Check for early departure
            if (attendance.logoutTime) {
              const logoutTime = new Date(attendance.logoutTime)
              const shiftEnd = employee.shiftTime?.end || "18:00"
              const [endHour, endMinute] = shiftEnd.split(":").map(Number)
              const expectedLogout = new Date(day)
              expectedLogout.setHours(endHour, endMinute, 0, 0)

              if (logoutTime < expectedLogout) {
                earlyDepartures++
              }
            }
            break
          case "half_day":
            halfDays++
            totalHours += (attendance.totalHours || 0) / 2
            break
          case "absent":
            absentDays++
            break
        }
      }

      const averageHours = presentDays + halfDays > 0 ? totalHours / (presentDays + halfDays * 0.5) : 0
      const attendancePercentage =
        totalWorkingDays > 0
          ? ((presentDays + halfDays * 0.5) / totalWorkingDays) * 100
          : 0

      reportData.push({
        employeeId: employee._id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        role: employee.role,
        jobRole: employee.jobRole,
        presentDays,
        absentDays,
        halfDays,
        leaveDays,
        totalWorkingDays,
        totalHours: totalHours.toFixed(2),
        averageHours: averageHours.toFixed(2),
        lateArrivals,
        earlyDepartures,
        attendancePercentage: attendancePercentage.toFixed(2),
      })
    }

    return NextResponse.json({
      report: {
        type: "attendance",
        period: {
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
        },
        summary: {
          totalEmployees: reportData.length,
          totalPresentDays: reportData.reduce((sum, e) => sum + e.presentDays, 0),
          totalAbsentDays: reportData.reduce((sum, e) => sum + e.absentDays, 0),
          totalLeaveDays: reportData.reduce((sum, e) => sum + e.leaveDays, 0),
          averageAttendancePercentage:
            reportData.length > 0
              ? (
                  reportData.reduce((sum, e) => sum + parseFloat(e.attendancePercentage), 0) /
                  reportData.length
                ).toFixed(2)
              : "0.00",
        },
        data: reportData,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error generating attendance report:", error)
    return NextResponse.json(
      { error: "Failed to generate attendance report" },
      { status: 500 }
    )
  }
}

