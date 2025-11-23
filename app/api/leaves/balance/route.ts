import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import LeaveBalance from "@/models/LeaveBalance"
import Leave from "@/models/Leave"

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
    const all = searchParams.get("all") === "true"

    // If HR wants all balances
    if (all && (user.role === "hr_manager" || user.role === "primary_admin" || user.role === "secondary_admin")) {
      const balances = await LeaveBalance.find({
        companyId: user.companyId,
        year,
      })
        .populate("userId", "name email")
        .sort({ "userId.name": 1 })

      return NextResponse.json({
        balances: balances.map((b) => ({
          _id: b._id,
          userId: b.userId,
          year: b.year,
          earnedLeave: b.earnedLeave,
          sickLeave: b.sickLeave,
          compOff: b.compOff,
          casualLeave: b.casualLeave,
        })),
      })
    }

    const currentYear = year
    let leaveBalance = await LeaveBalance.findOne({
      userId: user.id,
      companyId: user.companyId,
      year: currentYear,
    })

    // If no balance exists, create one with default values
    if (!leaveBalance) {
      leaveBalance = await LeaveBalance.create({
        userId: user.id,
        companyId: user.companyId,
        year: currentYear,
        earnedLeave: 12, // Default annual leave
        sickLeave: 6, // Default sick leave
        compOff: 0,
        casualLeave: 6, // Default casual leave
      })
    }

    // Calculate used leaves
    const usedLeaves = await Leave.aggregate([
      {
        $match: {
          userId: user.id,
          status: "approved",
          $expr: {
            $eq: [{ $year: "$fromDate" }, currentYear],
          },
        },
      },
      {
        $group: {
          _id: "$leaveType",
          totalDays: { $sum: "$numberOfDays" },
        },
      },
    ])

    const used = {
      earned: 0,
      sick: 0,
      comp_off: 0,
      casual: 0,
    }

    usedLeaves.forEach((item) => {
      used[item._id as keyof typeof used] = item.totalDays
    })

    return NextResponse.json({
      balance: {
        earnedLeave: {
          total: leaveBalance.earnedLeave,
          used: used.earned,
          available: leaveBalance.earnedLeave - used.earned,
        },
        sickLeave: {
          total: leaveBalance.sickLeave,
          used: used.sick,
          available: leaveBalance.sickLeave - used.sick,
        },
        compOff: {
          total: leaveBalance.compOff,
          used: used.comp_off,
          available: leaveBalance.compOff - used.comp_off,
        },
        casualLeave: {
          total: leaveBalance.casualLeave,
          used: used.casual,
          available: leaveBalance.casualLeave - used.casual,
        },
      },
    })
  } catch (error) {
    console.error("Error fetching leave balance:", error)
    return NextResponse.json(
      { error: "Failed to fetch leave balance" },
      { status: 500 }
    )
  }
}


