import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Payslip from "@/models/Payslip"
import User from "@/models/User"
import { sendEmail, generatePayslipEmailHTML } from "@/lib/email"
import { generatePayslipPDF } from "@/lib/payslipPdf"

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
    const { payslipIds, employeeIds, month, year } = body

    await connectDB()

    let payslipsToSend = []

    // If payslipIds provided, use those
    if (payslipIds && Array.isArray(payslipIds) && payslipIds.length > 0) {
      payslipsToSend = await Payslip.find({
        _id: { $in: payslipIds },
        companyId: user.companyId,
      }).populate("userId", "name email")
    }
    // If employeeIds and month/year provided, find payslips
    else if (employeeIds && month && year) {
      payslipsToSend = await Payslip.find({
        userId: { $in: employeeIds },
        companyId: user.companyId,
        month,
        year,
      }).populate("userId", "name email")
    } else {
      return NextResponse.json(
        { error: "Please provide payslipIds or employeeIds with month and year" },
        { status: 400 }
      )
    }

    const results = []
    const errors = []

    for (const payslip of payslipsToSend) {
      try {
        const employee = payslip.userId as any

        // Generate PDF
        const pdfBuffer = await generatePayslipPDF(
          payslip._id.toString(),
          employee._id.toString(),
          user.companyId
        )

        // Generate email HTML
        const emailHTML = generatePayslipEmailHTML(
          employee.name,
          payslip.month,
          payslip.year,
          payslip.netPay,
          "INR"
        )

        // Send email
        await sendEmail({
          to: employee.email,
          subject: `Payslip for ${new Date(payslip.year, payslip.month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
          html: emailHTML,
          attachments: [
            {
              filename: `payslip-${payslip.month}-${payslip.year}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        })

        // Update payslip status
        payslip.status = "sent"
        payslip.sentAt = new Date()
        await payslip.save()

        results.push({
          employeeName: employee.name,
          employeeEmail: employee.email,
          status: "sent",
        })
      } catch (error: any) {
        errors.push({
          employeeName: (payslip.userId as any).name,
          error: error.message || "Failed to send email",
        })
      }
    }

    return NextResponse.json({
      message: `Sent ${results.length} payslip(s) via email`,
      results,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error("Error sending payslip emails:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send payslip emails" },
      { status: 500 }
    )
  }
}

