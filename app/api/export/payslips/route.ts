import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Payslip from "@/models/Payslip"
import User from "@/models/User"
import { format } from "date-fns"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only HR and admins can export payslips
    if (
      user.role !== "hr_manager" &&
      user.role !== "primary_admin" &&
      user.role !== "secondary_admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    const year = searchParams.get("year")
    const employeeId = searchParams.get("employeeId")

    await connectDB()

    // Build query
    const query: any = { companyId: user.companyId }

    if (month && year) {
      query.month = parseInt(month)
      query.year = parseInt(year)
    }

    if (employeeId) {
      query.userId = employeeId
    }

    // Fetch payslips
    const payslips = await Payslip.find(query)
      .populate("userId", "name email employeeId")
      .sort({ createdAt: -1 })
      .lean()

    // Format data for export
    const exportData = payslips.map((payslip: any) => ({
      employeeName: payslip.userId?.name || "N/A",
      employeeId: payslip.userId?.employeeId || payslip.userId?._id || "N/A",
      email: payslip.userId?.email || "N/A",
      month: payslip.month,
      year: payslip.year,
      grossPay: payslip.grossPay || 0,
      totalDeductions: payslip.totalDeductions || 0,
      netPay: payslip.netPay || 0,
      status: payslip.status || "generated",
      generatedAt: payslip.createdAt,
    }))

    return NextResponse.json({
      success: true,
      message: "Payslips export ready",
      data: exportData,
      count: exportData.length,
    })
  } catch (error: any) {
    console.error("Error exporting payslips:", error)
    return NextResponse.json(
      { error: error.message || "Failed to export payslips" },
      { status: 500 }
    )
  }
}

