import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Attendance from "@/models/Attendance"
import User from "@/models/User"
import { startOfDay, endOfDay } from "date-fns"

export async function POST() {
  try {
    const user = await getCurrentUser()

    // Explicitly check for authentication
    if (!user || !user.id || !user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const today = new Date()
    const dayStart = startOfDay(today)
    const dayEnd = endOfDay(today)

    // Check if attendance already exists
    let attendance = await Attendance.findOne({
      userId: user.id,
      companyId: user.companyId,
      date: {
        $gte: dayStart,
        $lte: dayEnd,
      },
    })

    if (attendance && attendance.loginTime) {
      return NextResponse.json(
        { error: "Already logged in today" },
        { status: 400 }
      )
    }

    if (!attendance) {
      // Get user details for shift time
      const userDoc = await User.findById(user.id)
      
      attendance = await Attendance.create({
        userId: user.id,
        companyId: user.companyId,
        date: today,
        loginTime: new Date(),
        status: "present",
        breaks: [],
        tasks: [],
      })
    } else {
      attendance.loginTime = new Date()
      attendance.status = "present"
      await attendance.save()
    }

    return NextResponse.json({ attendance }, { status: 201 })
  } catch (error) {
    console.error("Error logging in:", error)
    return NextResponse.json(
      { error: "Failed to log in" },
      { status: 500 }
    )
  }
}

