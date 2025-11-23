import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { format } from "date-fns"

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { reportType, format: exportFormat, dateRange, filters } = body

    await connectDB()

    let reportData: any = null

    // Generate report based on type
    switch (reportType) {
      case "attendance":
        reportData = await generateAttendanceReport(
          user.companyId,
          dateRange,
          filters
        )
        break
      case "leave":
        reportData = await generateLeaveReport(
          user.companyId,
          dateRange,
          filters
        )
        break
      case "salary":
        reportData = await generateSalaryReport(
          user.companyId,
          dateRange,
          filters
        )
        break
      default:
        return NextResponse.json(
          { error: "Invalid report type" },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: "Report generated",
      data: reportData,
      format: exportFormat,
      reportType,
    })
  } catch (error: any) {
    console.error("Error generating report:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate report" },
      { status: 500 }
    )
  }
}

async function generateAttendanceReport(
  companyId: string,
  dateRange: any,
  filters: any
) {
  const Attendance = (await import("@/models/Attendance")).default

  const query: any = { companyId }
  if (dateRange?.startDate && dateRange?.endDate) {
    query.date = {
      $gte: new Date(dateRange.startDate),
      $lte: new Date(dateRange.endDate),
    }
  }

  const attendance = await Attendance.find(query)
    .populate("userId", "name employeeId department")
    .lean()

  return {
    type: "attendance",
    period: dateRange,
    summary: {
      total: attendance.length,
      present: attendance.filter((a: any) => a.status === "present").length,
      absent: attendance.filter((a: any) => a.status === "absent").length,
      leave: attendance.filter((a: any) => a.status === "leave").length,
    },
    data: attendance,
  }
}

async function generateLeaveReport(
  companyId: string,
  dateRange: any,
  filters: any
) {
  const Leave = (await import("@/models/Leave")).default

  const query: any = { companyId }
  if (dateRange?.startDate && dateRange?.endDate) {
    query.startDate = {
      $gte: new Date(dateRange.startDate),
      $lte: new Date(dateRange.endDate),
    }
  }

  const leaves = await Leave.find(query)
    .populate("userId", "name employeeId department")
    .lean()

  return {
    type: "leave",
    period: dateRange,
    summary: {
      total: leaves.length,
      pending: leaves.filter((l: any) => l.status === "pending").length,
      approved: leaves.filter((l: any) => l.status === "approved").length,
      rejected: leaves.filter((l: any) => l.status === "rejected").length,
    },
    data: leaves,
  }
}

async function generateSalaryReport(
  companyId: string,
  dateRange: any,
  filters: any
) {
  const Payslip = (await import("@/models/Payslip")).default

  const query: any = { companyId }
  if (dateRange?.month && dateRange?.year) {
    query.month = dateRange.month
    query.year = dateRange.year
  }

  const payslips = await Payslip.find(query)
    .populate("userId", "name employeeId department")
    .lean()

  const totalGross = payslips.reduce((sum: number, p: any) => sum + (p.grossPay || 0), 0)
  const totalDeductions = payslips.reduce((sum: number, p: any) => sum + (p.totalDeductions || 0), 0)
  const totalNet = payslips.reduce((sum: number, p: any) => sum + (p.netPay || 0), 0)

  return {
    type: "salary",
    period: dateRange,
    summary: {
      totalEmployees: payslips.length,
      totalGrossPay: totalGross,
      totalDeductions,
      totalNetPay: totalNet,
    },
    data: payslips,
  }
}

