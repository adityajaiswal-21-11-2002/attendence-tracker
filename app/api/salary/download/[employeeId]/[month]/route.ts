import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Payslip from "@/models/Payslip"
import { generatePayslipPDF } from "@/lib/payslipPdf"

export async function GET(
  request: Request,
  { params }: { params: { employeeId: string; month: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") || new Date().getFullYear().toString()

    // Find payslip
    const payslip = await Payslip.findOne({
      userId: params.employeeId,
      month: parseInt(params.month),
      year: parseInt(year),
    })

    if (!payslip) {
      return NextResponse.json({ error: "Payslip not found" }, { status: 404 })
    }

    // Check authorization - employee can only view their own, HR can view any
    if (
      user.role === "employee" &&
      payslip.userId.toString() !== user.id
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // If employeeId is "employee", use current user's ID
    let actualEmployeeId = params.employeeId
    if (params.employeeId === "employee" && user.role === "employee") {
      actualEmployeeId = user.id
    }

    if (
      (user.role === "hr_manager" ||
        user.role === "primary_admin" ||
        user.role === "secondary_admin") &&
      payslip.companyId.toString() !== user.companyId
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Generate PDF
    const pdfBuffer = await generatePayslipPDF(
      payslip._id.toString(),
      params.employeeId,
      payslip.companyId.toString()
    )

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="payslip-${params.employeeId}-${year}-${params.month}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error("Error generating payslip PDF:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate payslip PDF" },
      { status: 500 }
    )
  }
}

