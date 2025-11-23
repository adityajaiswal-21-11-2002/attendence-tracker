import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Payslip from "@/models/Payslip"
import SalaryConfiguration from "@/models/SalaryConfiguration"
import User from "@/models/User"
import { calculateSalary } from "@/lib/salaryCalculator"
import { startOfMonth, endOfMonth } from "date-fns"
import { notifyPayslipGenerated } from "@/lib/notifications"

export async function POST(request: Request) {
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

    const body = await request.json()
    const { month, year, employeeIds } = body

    if (!month || !year) {
      return NextResponse.json(
        { error: "Month and year are required" },
        { status: 400 }
      )
    }

    await connectDB()

    // Get employees to process
    let employees
    if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
      employees = await User.find({
        _id: { $in: employeeIds },
        companyId: user.companyId,
        role: "employee",
        isActive: true,
      })
    } else {
      employees = await User.find({
        companyId: user.companyId,
        role: "employee",
        isActive: true,
      })
    }

    const salaryPeriod = {
      startDate: startOfMonth(new Date(year, month - 1, 1)),
      endDate: endOfMonth(new Date(year, month - 1, 1)),
    }

    const generatedPayslips = []
    const errors = []

    for (const employee of employees) {
      try {
        // Check if payslip already exists
        const existingPayslip = await Payslip.findOne({
          userId: employee._id,
          month,
          year,
        })

        if (existingPayslip) {
          errors.push({
            employee: employee.name,
            error: "Payslip already exists for this month",
          })
          continue
        }

        // Check if salary configuration exists
        const config = await SalaryConfiguration.findOne({
          userId: employee._id,
          companyId: user.companyId,
        })

        if (!config) {
          errors.push({
            employee: employee.name,
            error: "Salary configuration not found",
          })
          continue
        }

        // Calculate salary
        const calculation = await calculateSalary(
          employee._id.toString(),
          user.companyId,
          month,
          year
        )

        // Create payslip
        const payslip = await Payslip.create({
          userId: employee._id,
          companyId: user.companyId,
          month,
          year,
          salaryPeriod,
          earnings: [
            {
              name: "Base Pay",
              amount: calculation.basePay,
              type: "base",
            },
            ...(calculation.overtimePay > 0
              ? [
                  {
                    name: "Overtime Pay",
                    amount: calculation.overtimePay,
                    type: "overtime",
                  },
                ]
              : []),
          ],
          deductions: calculation.deductions.map((d) => ({
            name: d.name,
            amount: d.amount,
            type: d.type === "tax" ? "tax" : d.type === "insurance" ? "insurance" : "other",
          })),
          grossPay: calculation.grossPay,
          totalDeductions: calculation.totalDeductions,
          netPay: calculation.netPay,
          attendanceSummary: calculation.attendanceSummary,
          status: "generated",
          generatedBy: user.id,
          generatedAt: new Date(),
        })

        // Notify employee about payslip generation
        await notifyPayslipGenerated(
          employee._id.toString(),
          user.companyId,
          month,
          year,
          payslip.netPay
        )

        generatedPayslips.push({
          _id: payslip._id,
          employeeName: employee.name,
          employeeEmail: employee.email,
          netPay: payslip.netPay,
        })
      } catch (error: any) {
        errors.push({
          employee: employee.name,
          error: error.message || "Failed to generate payslip",
        })
      }
    }

    return NextResponse.json({
      message: `Generated ${generatedPayslips.length} payslip(s)`,
      payslips: generatedPayslips,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Error generating payslips:", error)
    return NextResponse.json(
      { error: "Failed to generate payslips" },
      { status: 500 }
    )
  }
}

