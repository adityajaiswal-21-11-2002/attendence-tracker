import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Attendance from "@/models/Attendance"
import User from "@/models/User"
import { startOfDay, endOfDay } from "date-fns"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get("date")
    const targetDate = dateParam ? new Date(dateParam) : new Date()

    await connectDB()

    const dayStart = startOfDay(targetDate)
    const dayEnd = endOfDay(targetDate)

    // Get employees based on role
    let employeeQuery: any = {
      companyId: user.companyId,
      role: { $ne: "secondary_admin" },
      isActive: true,
    }

    // Team Lead can only see their team members
    if (user.role === "team_lead") {
      employeeQuery.managerId = user.id
    }

    const employees = await User.find(employeeQuery).lean()

    // Get attendance records for the date
    const attendances = await Attendance.find({
      companyId: user.companyId,
      date: {
        $gte: dayStart,
        $lte: dayEnd,
      },
    }).lean()

    // Build status map
    const attendanceMap = new Map()
    attendances.forEach((att) => {
      attendanceMap.set(att.userId.toString(), att)
    })

    // Build employee status array
    const employeeStatuses = employees.map((emp) => {
      const attendance = attendanceMap.get(emp._id.toString())
      const userDoc = emp as any

      let status: "logged_in" | "on_break" | "logged_out" = "logged_out"
      let loginTime: Date | undefined
      let totalHours: number | undefined

      if (attendance) {
        if (attendance.logoutTime) {
          status = "logged_out"
          totalHours = attendance.totalHours
        } else if (attendance.loginTime) {
          // Check if on break
          const openBreak = attendance.breaks?.find(
            (b: any) => !b.breakOut
          )
          if (openBreak) {
            status = "on_break"
          } else {
            status = "logged_in"
          }
          loginTime = attendance.loginTime
        }
      }

      return {
        _id: emp._id.toString(),
        name: userDoc.name,
        email: userDoc.email,
        role: userDoc.role,
        status,
        loginTime,
        currentShift: userDoc.shiftTime
          ? `${userDoc.shiftTime.start} - ${userDoc.shiftTime.end}`
          : undefined,
        totalHours,
      }
    })

    // If requesting own status (employee)
    if (user.role === "employee") {
      const ownStatus = employeeStatuses.find(
        (e) => e._id === user.id
      )
      return NextResponse.json({
        attendance: ownStatus
          ? {
              isLoggedIn: ownStatus.status === "logged_in",
              isOnBreak: ownStatus.status === "on_break",
              loginTime: ownStatus.loginTime,
              totalBreakDuration: 0, // Calculate from breaks if needed
              currentShift: ownStatus.currentShift
                ? {
                    start: ownStatus.currentShift.split(" - ")[0],
                    end: ownStatus.currentShift.split(" - ")[1],
                  }
                : undefined,
            }
          : {
              isLoggedIn: false,
              isOnBreak: false,
              totalBreakDuration: 0,
            },
      })
    }

    return NextResponse.json({ employees: employeeStatuses })
  } catch (error) {
    console.error("Error fetching live status:", error)
    return NextResponse.json(
      { error: "Failed to fetch live status" },
      { status: 500 }
    )
  }
}

