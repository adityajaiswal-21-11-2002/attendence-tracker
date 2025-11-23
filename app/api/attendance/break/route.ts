import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Attendance from "@/models/Attendance"
import { z } from "zod"
import { startOfDay, endOfDay } from "date-fns"

const breakSchema = z.object({
  action: z.enum(["break_in", "break_out"]),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = breakSchema.parse(body)

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
        { error: "Must be logged in to take a break" },
        { status: 400 }
      )
    }

    if (attendance.logoutTime) {
      return NextResponse.json(
        { error: "Cannot take break after logout" },
        { status: 400 }
      )
    }

    if (validatedData.action === "break_in") {
      // Check if already on break
      const openBreak = attendance.breaks.find((b) => !b.breakOut)
      if (openBreak) {
        return NextResponse.json(
          { error: "Already on break" },
          { status: 400 }
        )
      }

      attendance.breaks.push({
        breakIn: new Date(),
      })
    } else {
      // break_out
      const openBreak = attendance.breaks.find((b) => !b.breakOut)
      if (!openBreak) {
        return NextResponse.json(
          { error: "Not currently on break" },
          { status: 400 }
      )
      }

      openBreak.breakOut = new Date()
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

    console.error("Error managing break:", error)
    return NextResponse.json(
      { error: "Failed to manage break" },
      { status: 500 }
    )
  }
}

