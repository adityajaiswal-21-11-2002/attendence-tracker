import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Leave from "@/models/Leave"
import LeaveBalance from "@/models/LeaveBalance"
import User from "@/models/User"
import { format } from "date-fns"
import * as XLSX from "xlsx"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (
      !user ||
      (user.role !== "hr_manager" &&
        user.role !== "primary_admin" &&
        user.role !== "secondary_admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : new Date().getFullYear()
    const formatType = searchParams.get("format") || "json"

    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31, 23, 59, 59)

    // Get all employees in the company
    const employees = await User.find({
      companyId: user.companyId,
      role: "employee",
      isActive: true,
    })

    const reportData = []

    for (const employee of employees) {
      const leaveBalance = await LeaveBalance.findOne({
        userId: employee._id,
        companyId: user.companyId,
        year,
      })

      const leaves = await Leave.find({
        userId: employee._id,
        fromDate: { $gte: startDate, $lte: endDate },
      }).populate("approvedBy", "name")

      const leaveStats = {
        earned: { total: 0, approved: 0, pending: 0, rejected: 0 },
        sick: { total: 0, approved: 0, pending: 0, rejected: 0 },
        comp_off: { total: 0, approved: 0, pending: 0, rejected: 0 },
        casual: { total: 0, approved: 0, pending: 0, rejected: 0 },
      }

      leaves.forEach((leave) => {
        const type = leave.leaveType as keyof typeof leaveStats
        leaveStats[type].total += leave.numberOfDays
        if (leave.status === "approved") {
          leaveStats[type].approved += leave.numberOfDays
        } else if (leave.status === "pending") {
          leaveStats[type].pending += leave.numberOfDays
        } else {
          leaveStats[type].rejected += leave.numberOfDays
        }
      })

      reportData.push({
        "Employee Name": employee.name,
        "Employee Email": employee.email,
        "Earned Leave Balance": leaveBalance?.earnedLeave || 0,
        "Earned Leave Used": leaveStats.earned.approved,
        "Earned Leave Pending": leaveStats.earned.pending,
        "Sick Leave Balance": leaveBalance?.sickLeave || 0,
        "Sick Leave Used": leaveStats.sick.approved,
        "Sick Leave Pending": leaveStats.sick.pending,
        "Comp Off Balance": leaveBalance?.compOff || 0,
        "Comp Off Used": leaveStats.comp_off.approved,
        "Comp Off Pending": leaveStats.comp_off.pending,
        "Casual Leave Balance": leaveBalance?.casualLeave || 0,
        "Casual Leave Used": leaveStats.casual.approved,
        "Casual Leave Pending": leaveStats.casual.pending,
        "Total Leaves Taken": leaveStats.earned.approved +
          leaveStats.sick.approved +
          leaveStats.comp_off.approved +
          leaveStats.casual.approved,
      })
    }

    if (formatType === "excel") {
      const worksheet = XLSX.utils.json_to_sheet(reportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Leave Report")
      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      })

      return new NextResponse(excelBuffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="leave-report-${year}.xlsx"`,
        },
      })
    }

    return NextResponse.json({
      year,
      report: reportData,
    })
  } catch (error) {
    console.error("Error generating leave report:", error)
    return NextResponse.json(
      { error: "Failed to generate leave report" },
      { status: 500 }
    )
  }
}


