import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Holiday from "@/models/Holiday"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : new Date().getFullYear()

    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31, 23, 59, 59)

    const holidays = await Holiday.find({
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 })

    return NextResponse.json({
      holidays: holidays.map((holiday) => ({
        _id: holiday._id,
        name: holiday.name,
        date: holiday.date,
        isNational: holiday.isNational,
      })),
    })
  } catch (error) {
    console.error("Error fetching holidays:", error)
    return NextResponse.json(
      { error: "Failed to fetch holidays" },
      { status: 500 }
    )
  }
}


