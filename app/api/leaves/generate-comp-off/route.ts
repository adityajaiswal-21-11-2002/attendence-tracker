import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Roster from "@/models/Roster"
import Holiday from "@/models/Holiday"
import LeaveBalance from "@/models/LeaveBalance"
import { format } from "date-fns"

// This function should be called when a roster is created/updated
// or can be run as a scheduled job to check for employees working on holidays
export async function POST(request: Request) {
  try {
    await connectDB()

    const body = await request.json()
    const { userId, date } = body

    if (!userId || !date) {
      return NextResponse.json(
        { error: "User ID and date are required" },
        { status: 400 }
      )
    }

    const rosterDate = new Date(date)
    const dateStr = format(rosterDate, "yyyy-MM-dd")

    // Check if the date is a holiday
    const holiday = await Holiday.findOne({
      date: {
        $gte: new Date(rosterDate.getFullYear(), rosterDate.getMonth(), rosterDate.getDate()),
        $lt: new Date(rosterDate.getFullYear(), rosterDate.getMonth(), rosterDate.getDate() + 1),
      },
    })

    if (!holiday) {
      return NextResponse.json({
        message: "Date is not a holiday",
        compOffGenerated: false,
      })
    }

    // Check if roster exists for this date
    const roster = await Roster.findOne({
      userId,
      date: {
        $gte: new Date(rosterDate.getFullYear(), rosterDate.getMonth(), rosterDate.getDate()),
        $lt: new Date(rosterDate.getFullYear(), rosterDate.getMonth(), rosterDate.getDate() + 1),
      },
    })

    if (!roster) {
      return NextResponse.json({
        message: "No roster found for this date",
        compOffGenerated: false,
      })
    }

    // Check if comp off already generated for this date
    const year = rosterDate.getFullYear()
    const leaveBalance = await LeaveBalance.findOne({
      userId,
      companyId: roster.companyId,
      year,
    })

    if (!leaveBalance) {
      return NextResponse.json(
        { error: "Leave balance not found" },
        { status: 404 }
      )
    }

    // Generate comp off (1 day for working on a holiday)
    leaveBalance.compOff += 1
    await leaveBalance.save()

    return NextResponse.json({
      message: "Comp off generated successfully",
      compOffGenerated: true,
      holidayName: holiday.name,
      newBalance: leaveBalance.compOff,
    })
  } catch (error) {
    console.error("Error generating comp off:", error)
    return NextResponse.json(
      { error: "Failed to generate comp off" },
      { status: 500 }
    )
  }
}


