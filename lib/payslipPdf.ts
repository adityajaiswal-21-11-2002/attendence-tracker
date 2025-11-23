import jsPDF from "jspdf"
import Payslip from "@/models/Payslip"
import User from "@/models/User"
import Company from "@/models/Company"
import connectDB from "@/lib/mongodb"

export async function generatePayslipPDF(
  payslipId: string,
  userId: string,
  companyId: string
): Promise<Buffer> {
  await connectDB()

  const payslip = await Payslip.findById(payslipId)
    .populate("userId", "name email")
    .populate("companyId", "name email address")

  if (!payslip) {
    throw new Error("Payslip not found")
  }

  const employee = payslip.userId as any
  const company = payslip.companyId as any

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let yPos = margin

  // Helper function to add a new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      yPos = margin
    }
  }

  // Company Header
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text(company.name || "Company Name", margin, yPos)
  yPos += 10

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  if (company.address) {
    doc.text(company.address, margin, yPos)
    yPos += 5
  }
  if (company.email) {
    doc.text(`Email: ${company.email}`, margin, yPos)
    yPos += 5
  }
  yPos += 10

  // Title
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("PAYSLIP", pageWidth - margin - 30, margin)
  yPos = margin + 20

  // Salary Period
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  const periodText = `Period: ${new Date(payslip.salaryPeriod.startDate).toLocaleDateString()} - ${new Date(payslip.salaryPeriod.endDate).toLocaleDateString()}`
  doc.text(periodText, pageWidth - margin - doc.getTextWidth(periodText), yPos)
  yPos += 15

  // Employee Details
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("Employee Details", margin, yPos)
  yPos += 8

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Name: ${employee.name}`, margin, yPos)
  yPos += 6
  doc.text(`Email: ${employee.email}`, margin, yPos)
  yPos += 6
  doc.text(
    `Month: ${new Date(payslip.year, payslip.month - 1, 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })}`,
    margin,
    yPos
  )
  yPos += 15

  // Attendance Summary
  checkPageBreak(30)
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("Attendance Summary", margin, yPos)
  yPos += 8

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  const attendance = payslip.attendanceSummary
  doc.text(`Total Days: ${attendance.totalDays}`, margin, yPos)
  doc.text(`Present Days: ${attendance.presentDays}`, margin + 60, yPos)
  yPos += 6
  doc.text(`Absent Days: ${attendance.absentDays}`, margin, yPos)
  doc.text(`Half Days: ${attendance.halfDays}`, margin + 60, yPos)
  yPos += 6
  doc.text(`Leave Days: ${attendance.leaveDays}`, margin, yPos)
  doc.text(`Total Hours: ${attendance.totalHours.toFixed(2)}`, margin + 60, yPos)
  yPos += 6
  if (attendance.overtimeHours > 0) {
    doc.text(`Overtime Hours: ${attendance.overtimeHours.toFixed(2)}`, margin, yPos)
  }
  yPos += 15

  // Earnings
  checkPageBreak(40)
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("Earnings", margin, yPos)
  yPos += 8

  const earningsTableStart = yPos
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text("Description", margin, yPos)
  doc.text("Amount", pageWidth - margin - 40, yPos, { align: "right" })
  yPos += 6

  doc.setDrawColor(200, 200, 200)
  doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2)

  doc.setFont("helvetica", "normal")
  payslip.earnings.forEach((earning) => {
    checkPageBreak(10)
    doc.text(earning.name, margin + 5, yPos)
    doc.text(
      `${earning.amount.toFixed(2)}`,
      pageWidth - margin - 5,
      yPos,
      { align: "right" }
    )
    yPos += 6
  })

  yPos += 5
  doc.setFont("helvetica", "bold")
  doc.text("Gross Pay", margin, yPos)
  doc.text(
    `${payslip.grossPay.toFixed(2)}`,
    pageWidth - margin - 5,
    yPos,
    { align: "right" }
  )
  yPos += 15

  // Deductions
  checkPageBreak(40)
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("Deductions", margin, yPos)
  yPos += 8

  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.text("Description", margin, yPos)
  doc.text("Amount", pageWidth - margin - 40, yPos, { align: "right" })
  yPos += 6

  doc.setDrawColor(200, 200, 200)
  doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2)

  doc.setFont("helvetica", "normal")
  if (payslip.deductions.length === 0) {
    doc.text("No deductions", margin + 5, yPos)
    yPos += 6
  } else {
    payslip.deductions.forEach((deduction) => {
      checkPageBreak(10)
      doc.text(deduction.name, margin + 5, yPos)
      doc.text(
        `${deduction.amount.toFixed(2)}`,
        pageWidth - margin - 5,
        yPos,
        { align: "right" }
      )
      yPos += 6
    })
  }

  yPos += 5
  doc.setFont("helvetica", "bold")
  doc.text("Total Deductions", margin, yPos)
  doc.text(
    `${payslip.totalDeductions.toFixed(2)}`,
    pageWidth - margin - 5,
    yPos,
    { align: "right" }
  )
  yPos += 15

  // Net Pay
  checkPageBreak(20)
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 15)

  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text("Net Pay", margin + 5, yPos + 5)
  doc.text(
    `${payslip.netPay.toFixed(2)}`,
    pageWidth - margin - 5,
    yPos + 5,
    { align: "right" }
  )
  yPos += 25

  // Footer
  checkPageBreak(15)
  doc.setFontSize(8)
  doc.setFont("helvetica", "italic")
  doc.text(
    "This is a computer-generated document. No signature is required.",
    margin,
    yPos
  )
  yPos += 5
  doc.text(
    `Generated on: ${new Date().toLocaleDateString()}`,
    margin,
    yPos
  )

  // Convert to buffer
  const pdfOutput = doc.output("arraybuffer")
  return Buffer.from(pdfOutput)
}

