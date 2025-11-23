import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Attendance from "@/models/Attendance"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    // Explicitly check for authentication
    if (!user || !user.id || !user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    await connectDB()

    // Build query - only get records where user logged in (has loginTime)
    let query: any = {
      userId: user.id,
      loginTime: { $exists: true, $ne: null }, // Only include dates where user logged in
    }

    // Add date range filter if provided
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      // Set end date to end of day
      end.setHours(23, 59, 59, 999)
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format" },
          { status: 400 }
        )
      }

      if (end < start) {
        return NextResponse.json(
          { error: "End date must be after start date" },
          { status: 400 }
        )
      }

      query.date = {
        $gte: start,
        $lte: end,
      }
    }

    // Fetch attendance records, sorted by date descending (most recent first)
    const attendances = await Attendance.find(query)
      .sort({ date: -1 })
      .lean()

    // Format the response
    const history = attendances.map((att: any) => ({
      _id: att._id,
      date: att.date,
      loginTime: att.loginTime,
      logoutTime: att.logoutTime,
      totalHours: att.totalHours,
      status: att.status,
      breaks: att.breaks || [],
    }))

    return NextResponse.json({ history })
  } catch (error) {
    console.error("Error fetching attendance history:", error)
    return NextResponse.json(
      { error: "Failed to fetch attendance history" },
      { status: 500 }
    )
  }
}

