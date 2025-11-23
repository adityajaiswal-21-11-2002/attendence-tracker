import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import { calculateSalary } from "@/lib/salaryCalculator"
import { startOfMonth, endOfMonth } from "date-fns"

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
    const { userId, month, year } = body

    if (!userId || !month || !year) {
      return NextResponse.json(
        { error: "User ID, month, and year are required" },
        { status: 400 }
      )
    }

    await connectDB()

    // Verify employee belongs to company
    const User = (await import("@/models/User")).default
    const employee = await User.findById(userId)
    if (!employee || employee.companyId.toString() !== user.companyId) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const calculation = await calculateSalary(userId, user.companyId, month, year)

    const salaryPeriod = {
      startDate: startOfMonth(new Date(year, month - 1, 1)),
      endDate: endOfMonth(new Date(year, month - 1, 1)),
    }

    return NextResponse.json({
      calculation,
      salaryPeriod,
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
      },
    })
  } catch (error: any) {
    console.error("Error calculating salary:", error)
    return NextResponse.json(
      { error: error.message || "Failed to calculate salary" },
      { status: 500 }
    )
  }
}

