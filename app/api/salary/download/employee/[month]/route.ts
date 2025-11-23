import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Payslip from "@/models/Payslip"
import { generatePayslipPDF } from "@/lib/payslipPdf"

export async function GET(
  request: Request,
  { params }: { params: { month: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "employee") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") || new Date().getFullYear().toString()

    // Find payslip for current user
    const payslip = await Payslip.findOne({
      userId: user.id,
      month: parseInt(params.month),
      year: parseInt(year),
    })

    if (!payslip) {
      return NextResponse.json({ error: "Payslip not found" }, { status: 404 })
    }

    // Generate PDF
    const pdfBuffer = await generatePayslipPDF(
      payslip._id.toString(),
      user.id,
      user.companyId
    )

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="payslip-${year}-${params.month}.pdf"`,
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

