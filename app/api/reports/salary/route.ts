import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Payslip from "@/models/Payslip"
import User from "@/models/User"
import { z } from "zod"

const reportSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  department: z.string().optional(),
  role: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (
      !user ||
      (user.role !== "primary_admin" &&
        user.role !== "secondary_admin" &&
        user.role !== "hr_manager")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = reportSchema.parse(body)

    await connectDB()

    const startDate = new Date(validatedData.startDate)
    const endDate = new Date(validatedData.endDate)

    // Build user query
    let userQuery: any = {
      companyId: user.companyId,
      isActive: true,
    }

    if (validatedData.role && validatedData.role !== "all") {
      userQuery.role = validatedData.role
    }

    const employees = await User.find(userQuery).select("name email role jobRole")

    // Get payslips in date range
    const payslips = await Payslip.find({
      companyId: user.companyId,
      year: { $gte: startDate.getFullYear(), $lte: endDate.getFullYear() },
      month: {
        $gte: startDate.getFullYear() === endDate.getFullYear()
          ? startDate.getMonth() + 1
          : 1,
        $lte:
          startDate.getFullYear() === endDate.getFullYear()
            ? endDate.getMonth() + 1
            : 12,
      },
    })
      .populate("userId", "name email role")
      .sort({ year: -1, month: -1 })

    // Group by employee and calculate totals
    const employeeSalaryMap = new Map()

    for (const payslip of payslips) {
      const employee = payslip.userId as any
      const employeeId = employee._id.toString()

      if (!employeeSalaryMap.has(employeeId)) {
        employeeSalaryMap.set(employeeId, {
          employeeId,
          employeeName: employee.name,
          employeeEmail: employee.email,
          role: employee.role,
          payslips: [],
          totalGrossPay: 0,
          totalDeductions: 0,
          totalNetPay: 0,
          totalOvertimePay: 0,
        })
      }

      const empData = employeeSalaryMap.get(employeeId)
      empData.payslips.push({
        month: payslip.month,
        year: payslip.year,
        grossPay: payslip.grossPay,
        deductions: payslip.totalDeductions,
        netPay: payslip.netPay,
        overtimePay: payslip.earnings.find((e: any) => e.type === "overtime")?.amount || 0,
      })

      empData.totalGrossPay += payslip.grossPay
      empData.totalDeductions += payslip.totalDeductions
      empData.totalNetPay += payslip.netPay
      const overtimeEarning = payslip.earnings.find((e: any) => e.type === "overtime")
      if (overtimeEarning) {
        empData.totalOvertimePay += overtimeEarning.amount
      }
    }

    // Group by department/role
    const departmentBreakdown = new Map()
    const roleBreakdown = new Map()

    for (const [employeeId, data] of employeeSalaryMap.entries()) {
      const role = data.role
      if (!roleBreakdown.has(role)) {
        roleBreakdown.set(role, {
          role,
          employeeCount: 0,
          totalGrossPay: 0,
          totalDeductions: 0,
          totalNetPay: 0,
          totalOvertimePay: 0,
        })
      }

      const roleData = roleBreakdown.get(role)
      roleData.employeeCount++
      roleData.totalGrossPay += data.totalGrossPay
      roleData.totalDeductions += data.totalDeductions
      roleData.totalNetPay += data.totalNetPay
      roleData.totalOvertimePay += data.totalOvertimePay
    }

    const reportData = Array.from(employeeSalaryMap.values())
    const departmentData = Array.from(roleBreakdown.values())

    // Calculate totals
    const totals = {
      totalEmployees: reportData.length,
      totalGrossPay: reportData.reduce((sum, e) => sum + e.totalGrossPay, 0),
      totalDeductions: reportData.reduce((sum, e) => sum + e.totalDeductions, 0),
      totalNetPay: reportData.reduce((sum, e) => sum + e.totalNetPay, 0),
      totalOvertimePay: reportData.reduce((sum, e) => sum + e.totalOvertimePay, 0),
    }

    return NextResponse.json({
      report: {
        type: "salary",
        period: {
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
        },
        summary: totals,
        departmentBreakdown: departmentData,
        data: reportData,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error generating salary report:", error)
    return NextResponse.json(
      { error: "Failed to generate salary report" },
      { status: 500 }
    )
  }
}

