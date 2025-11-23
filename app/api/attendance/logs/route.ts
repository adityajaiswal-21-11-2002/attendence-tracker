import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Attendance from "@/models/Attendance"
import User from "@/models/User"

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate") || searchParams.get("start")
    const endDate = searchParams.get("endDate") || searchParams.get("end")
    const userId = searchParams.get("userId")
    const role = searchParams.get("role")

    await connectDB()

    let query: any = {
      companyId: user.companyId,
    }

    // Validate dates if provided (even if only one is provided)
    if (startDate || endDate) {
      if (!startDate || !endDate) {
        return NextResponse.json(
          { error: "Both startDate and endDate are required" },
          { status: 400 }
        )
      }

      // Validate date format
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format" },
          { status: 400 }
        )
      }

      // Check if endDate is before startDate
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

    if (userId) {
      query.userId = userId
    }

    let attendances = await Attendance.find(query)
      .populate("userId", "name email role")
      .sort({ date: -1 })
      .lean()

    // Filter by role if specified
    if (role && role !== "all") {
      attendances = attendances.filter(
        (att: any) => att.userId?.role === role
      )
    }

    return NextResponse.json({ logs: attendances })
  } catch (error) {
    console.error("Error fetching attendance logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch attendance logs" },
      { status: 500 }
    )
  }
}

