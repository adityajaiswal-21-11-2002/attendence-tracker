import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Task from "@/models/Task"
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

    const tasks = await Task.find({
      assignedTo: user.id,
      companyId: user.companyId,
      date: {
        $gte: dayStart,
        $lte: dayEnd,
      },
    })
      .populate("assignedBy", "name")
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    )
  }
}

