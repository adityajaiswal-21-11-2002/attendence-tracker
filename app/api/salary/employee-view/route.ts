import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Payslip from "@/models/Payslip"
import SalaryConfiguration from "@/models/SalaryConfiguration"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    const year = searchParams.get("year")

    // Get user's salary configuration
    const config = await SalaryConfiguration.findOne({
      userId: user.id,
      companyId: user.companyId,
    })

    // Get payslips
    let query: any = {
      userId: user.id,
      companyId: user.companyId,
    }

    if (month && year) {
      query.month = parseInt(month)
      query.year = parseInt(year)
    }

    const payslips = await Payslip.find(query)
      .sort({ year: -1, month: -1 })
      .limit(12)

    // Get current month payslip if exists
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()
    const currentPayslip = await Payslip.findOne({
      userId: user.id,
      month: currentMonth,
      year: currentYear,
    })

    return NextResponse.json({
      configuration: config
        ? {
            salaryType: config.salaryType,
            baseAmount: config.baseAmount,
            currency: config.currency,
            overtimeEnabled: config.overtimeEnabled,
          }
        : null,
      currentPayslip: currentPayslip
        ? {
            _id: currentPayslip._id,
            month: currentPayslip.month,
            year: currentPayslip.year,
            grossPay: currentPayslip.grossPay,
            totalDeductions: currentPayslip.totalDeductions,
            netPay: currentPayslip.netPay,
            status: currentPayslip.status,
            attendanceSummary: currentPayslip.attendanceSummary,
          }
        : null,
      payslips: payslips.map((p) => ({
        _id: p._id,
        month: p.month,
        year: p.year,
        grossPay: p.grossPay,
        totalDeductions: p.totalDeductions,
        netPay: p.netPay,
        status: p.status,
        generatedAt: p.generatedAt,
      })),
    })
  } catch (error) {
    console.error("Error fetching employee salary view:", error)
    return NextResponse.json(
      { error: "Failed to fetch salary information" },
      { status: 500 }
    )
  }
}

