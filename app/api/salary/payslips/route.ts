import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Payslip from "@/models/Payslip"

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
    const month = searchParams.get("month")
    const year = searchParams.get("year")

    let query: any = {
      companyId: user.companyId,
    }

    if (month) {
      query.month = parseInt(month)
    }
    if (year) {
      query.year = parseInt(year)
    }

    const payslips = await Payslip.find(query)
      .populate("userId", "name email")
      .sort({ year: -1, month: -1, createdAt: -1 })

    return NextResponse.json({
      payslips: payslips.map((p) => ({
        _id: p._id,
        userId: p.userId,
        month: p.month,
        year: p.year,
        grossPay: p.grossPay,
        totalDeductions: p.totalDeductions,
        netPay: p.netPay,
        status: p.status,
        generatedAt: p.generatedAt,
        sentAt: p.sentAt,
      })),
    })
  } catch (error) {
    console.error("Error fetching payslips:", error)
    return NextResponse.json(
      { error: "Failed to fetch payslips" },
      { status: 500 }
    )
  }
}

