import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Roster from "@/models/Roster"
import { startOfWeek, endOfWeek, addWeeks, format } from "date-fns"
import { z } from "zod"

const copyWeekSchema = z.object({
  targetWeek: z.string().datetime(),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (
      !user ||
      (user.role !== "operations_manager" && user.role !== "team_lead")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = copyWeekSchema.parse(body)

    await connectDB()

    const targetDate = new Date(validatedData.targetWeek)
    const previousWeekStart = startOfWeek(addWeeks(targetDate, -1), {
      weekStartsOn: 1,
    })
    const previousWeekEnd = endOfWeek(addWeeks(targetDate, -1), {
      weekStartsOn: 1,
    })
    const targetWeekStart = startOfWeek(targetDate, { weekStartsOn: 1 })
    const targetWeekEnd = endOfWeek(targetDate, { weekStartsOn: 1 })

    // Get previous week's rosters
    const previousRosters = await Roster.find({
      companyId: user.companyId,
      date: {
        $gte: previousWeekStart,
        $lte: previousWeekEnd,
      },
    }).lean()

    if (previousRosters.length === 0) {
      return NextResponse.json(
        { error: "No rosters found for previous week" },
        { status: 404 }
      )
    }

    // Create new rosters for target week
    const newRosters = []
    for (const roster of previousRosters) {
      const daysDiff =
        (targetWeekStart.getTime() - previousWeekStart.getTime()) /
        (1000 * 60 * 60 * 24)
      const newDate = new Date(roster.date)
      newDate.setDate(newDate.getDate() + daysDiff)

      // Check if roster already exists
      const existing = await Roster.findOne({
        userId: roster.userId,
        date: newDate,
        companyId: user.companyId,
      })

      if (!existing) {
        const newRoster = await Roster.create({
          userId: roster.userId,
          companyId: user.companyId,
          date: newDate,
          shiftType: roster.shiftType,
          shiftTime: roster.shiftTime,
          jobRole: roster.jobRole,
          tasks: [],
          createdBy: user.id,
        })
        newRosters.push(newRoster)
      }
    }

    return NextResponse.json({
      message: `Copied ${newRosters.length} rosters to target week`,
      rosters: newRosters,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error copying week:", error)
    return NextResponse.json(
      { error: "Failed to copy week roster" },
      { status: 500 }
    )
  }
}

