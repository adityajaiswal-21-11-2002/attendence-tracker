import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Attendance from "@/models/Attendance"
import { z } from "zod"
import { startOfDay, endOfDay, differenceInHours } from "date-fns"

const editSchema = z.object({
  date: z.string(),
  loginTime: z.string().datetime().optional(),
  logoutTime: z.string().datetime().optional(),
  totalHours: z.number().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (
      !user ||
      (user.role !== "operations_manager" &&
        user.role !== "hr_manager" &&
        user.role !== "primary_admin" &&
        user.role !== "secondary_admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = editSchema.parse(body)

    await connectDB()

    const targetDate = new Date(validatedData.date)
    const dayStart = startOfDay(targetDate)
    const dayEnd = endOfDay(targetDate)

    // Find attendance by user ID and date
    let attendance = await Attendance.findOne({
      userId: params.id,
      companyId: user.companyId,
      date: {
        $gte: dayStart,
        $lte: dayEnd,
      },
    })

    if (!attendance) {
      // Create new attendance record
      attendance = await Attendance.create({
        userId: params.id,
        companyId: user.companyId,
        date: targetDate,
        status: "present",
        breaks: [],
        tasks: [],
      })
    }

    // Update fields
    if (validatedData.loginTime) {
      attendance.loginTime = new Date(validatedData.loginTime)
    }

    if (validatedData.logoutTime) {
      attendance.logoutTime = new Date(validatedData.logoutTime)
    }

    if (validatedData.totalHours !== undefined) {
      attendance.totalHours = validatedData.totalHours
    } else if (attendance.loginTime && attendance.logoutTime) {
      // Auto-calculate if both times provided
      const totalMinutes =
        (attendance.logoutTime.getTime() - attendance.loginTime.getTime()) /
        (1000 * 60)
      let totalBreakMinutes = 0
      attendance.breaks.forEach((breakItem) => {
        if (breakItem.breakOut) {
          const breakDuration =
            (breakItem.breakOut.getTime() - breakItem.breakIn.getTime()) /
            (1000 * 60)
          totalBreakMinutes += breakDuration
        }
      })
      attendance.totalHours = (totalMinutes - totalBreakMinutes) / 60
    }

    await attendance.save()

    return NextResponse.json({ attendance })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error editing attendance:", error)
    return NextResponse.json(
      { error: "Failed to edit attendance" },
      { status: 500 }
    )
  }
}

