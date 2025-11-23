import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Roster from "@/models/Roster"
import User from "@/models/User"
import Holiday from "@/models/Holiday"
import LeaveBalance from "@/models/LeaveBalance"
import { format } from "date-fns"
import { z } from "zod"
import { notifyRosterUpdate } from "@/lib/notifications"

const rosterSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  date: z.string().refine(
    (val) => {
      const date = new Date(val)
      return !isNaN(date.getTime())
    },
    { message: "Invalid date format" }
  ),
  shiftType: z.enum(["morning", "evening", "night", "custom"], {
    errorMap: () => ({ message: "Invalid shift type" }),
  }),
  shiftTime: z.object({
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  }),
  jobRole: z.string().min(1, "Job role is required"),
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
    
    // Validate request body
    let validatedData
    try {
      validatedData = rosterSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation error", details: error.errors },
          { status: 400 }
        )
      }
      throw error
    }

    await connectDB()

    // Verify employee belongs to company
    const employee = await User.findOne({
      _id: validatedData.userId,
      companyId: user.companyId,
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Check if roster already exists for this user and date
    const existingRoster = await Roster.findOne({
      userId: validatedData.userId,
      date: new Date(validatedData.date),
      companyId: user.companyId,
    })

    if (existingRoster) {
      return NextResponse.json(
        { error: "Roster already exists for this employee on this date" },
        { status: 400 }
      )
    }

    const rosterDate = new Date(validatedData.date)
    const roster = await Roster.create({
      userId: validatedData.userId,
      companyId: user.companyId,
      date: rosterDate,
      shiftType: validatedData.shiftType,
      shiftTime: validatedData.shiftTime,
      jobRole: validatedData.jobRole,
      tasks: [],
      createdBy: user.id,
    })

    // Check if the date is a holiday and auto-generate comp off
    const dateStr = format(rosterDate, "yyyy-MM-dd")
    const holiday = await Holiday.findOne({
      date: {
        $gte: new Date(rosterDate.getFullYear(), rosterDate.getMonth(), rosterDate.getDate()),
        $lt: new Date(rosterDate.getFullYear(), rosterDate.getMonth(), rosterDate.getDate() + 1),
      },
    })

    if (holiday) {
      const year = rosterDate.getFullYear()
      let leaveBalance = await LeaveBalance.findOne({
        userId: validatedData.userId,
        companyId: user.companyId,
        year,
      })

      if (!leaveBalance) {
        // Create leave balance if it doesn't exist
        leaveBalance = await LeaveBalance.create({
          userId: validatedData.userId,
          companyId: user.companyId,
          year,
          earnedLeave: 12,
          sickLeave: 6,
          compOff: 1, // Add comp off for working on holiday
          casualLeave: 6,
        })
      } else {
        // Add comp off for working on holiday
        leaveBalance.compOff += 1
        await leaveBalance.save()
      }
    }

    // Notify employee about roster update
    await notifyRosterUpdate(
      validatedData.userId,
      user.companyId,
      rosterDate,
      {
        shiftType: validatedData.shiftType,
        shiftTime: validatedData.shiftTime,
      }
    )

    return NextResponse.json({ roster }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating roster:", error)
    return NextResponse.json(
      { error: "Failed to create roster" },
      { status: 500 }
    )
  }
}

