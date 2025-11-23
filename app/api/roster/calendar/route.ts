import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Roster from "@/models/Roster"
import { z } from "zod"

const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
}).refine(
  (data) => {
    const start = data.startDate || data.start
    const end = data.endDate || data.end
    return start && end
  },
  { message: "Start and end dates are required" }
).refine(
  (data) => {
    const start = data.startDate || data.start
    const end = data.endDate || data.end
    if (!start || !end) return true
    
    const startDate = new Date(start)
    const endDate = new Date(end)
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return false
    }
    
    return endDate >= startDate
  },
  { message: "Invalid date format or end date must be after start date" }
)

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (
      !user ||
      (user.role !== "operations_manager" && user.role !== "team_lead")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate") || undefined
    const endDate = searchParams.get("endDate") || undefined
    const start = searchParams.get("start") || undefined
    const end = searchParams.get("end") || undefined

    // Validate query parameters
    let validatedData
    try {
      validatedData = querySchema.parse({ startDate, endDate, start, end })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation error", details: error.errors },
          { status: 400 }
        )
      }
      throw error
    }
    
    const finalStart = validatedData.startDate || validatedData.start
    const finalEnd = validatedData.endDate || validatedData.end

    await connectDB()

    const rosters = await Roster.find({
      companyId: user.companyId,
      date: {
        $gte: new Date(finalStart!),
        $lte: new Date(finalEnd!),
      },
    })
      .populate("userId", "name email")
      .populate("createdBy", "name")
      .sort({ date: 1 })
      .lean()

    return NextResponse.json({ rosters })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error fetching roster calendar:", error)
    return NextResponse.json(
      { error: "Failed to fetch roster calendar" },
      { status: 500 }
    )
  }
}

