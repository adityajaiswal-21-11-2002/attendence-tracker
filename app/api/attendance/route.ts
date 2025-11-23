import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Attendance from "@/models/Attendance"

export async function GET() {
  try {
    await connectDB()
    const attendance = await Attendance.find().populate("userId")
    return NextResponse.json({ attendance })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await connectDB()
    const body = await request.json()
    const attendance = await Attendance.create(body)
    return NextResponse.json({ attendance }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create attendance" },
      { status: 500 }
    )
  }
}

