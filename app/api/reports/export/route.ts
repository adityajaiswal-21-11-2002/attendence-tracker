import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Attendance from "@/models/Attendance"
import Leave from "@/models/Leave"
import Payslip from "@/models/Payslip"
import User from "@/models/User"
import LeaveBalance from "@/models/LeaveBalance"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import { format, parseISO, startOfDay, endOfDay, eachDayOfInterval, isWeekend } from "date-fns"
import { z } from "zod"

const exportSchema = z.object({
  reportType: z.enum(["attendance", "salary", "leave", "activity"]),
  dateRange: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }),
  filters: z.object({
    department: z.string().optional(),
    role: z.string().optional(),
  }),
  format: z.enum(["excel", "pdf", "csv"]),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (
      !user ||
      (user.role !== "primary_admin" &&
        user.role !== "secondary_admin" &&
        user.role !== "hr_manager" &&
        user.role !== "operations_manager" &&
        user.role !== "team_lead")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = exportSchema.parse(body)

    await connectDB()

    // Generate report data directly (reuse logic from report routes)
    let reportData: any = null

    // For simplicity, we'll call the report generation functions directly
    // In production, you might want to extract the logic into shared functions
    if (validatedData.reportType === "attendance") {
      // Simplified attendance report generation for export
      const startDate = startOfDay(parseISO(validatedData.dateRange.startDate))
      const endDate = endOfDay(parseISO(validatedData.dateRange.endDate))

      let userQuery: any = {
        companyId: user.companyId,
        isActive: true,
      }

      if (user.role === "team_lead") {
        userQuery.managerId = user.id
      }

      if (validatedData.filters.role && validatedData.filters.role !== "all") {
        userQuery.role = validatedData.filters.role
      }

      const employees = await User.find(userQuery).select("name email role jobRole shiftTime")
      const employeeIds = employees.map((e) => e._id)

      const attendanceRecords = await Attendance.find({
        userId: { $in: employeeIds },
        date: { $gte: startDate, $lte: endDate },
      })

      const reportDataArray = employees.map((employee) => {
        const empRecords = attendanceRecords.filter(
          (r) => r.userId.toString() === employee._id.toString()
        )
        const presentDays = empRecords.filter((r) => r.status === "present").length
        const absentDays = empRecords.filter((r) => r.status === "absent").length
        const totalHours = empRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0)

        return {
          employeeName: employee.name,
          email: employee.email,
          role: employee.role,
          presentDays,
          absentDays,
          totalHours: totalHours.toFixed(2),
        }
      })

      reportData = {
        summary: {
          totalEmployees: employees.length,
          totalPresentDays: reportDataArray.reduce((sum, e) => sum + e.presentDays, 0),
          totalAbsentDays: reportDataArray.reduce((sum, e) => sum + e.absentDays, 0),
        },
        data: reportDataArray,
      }
    } else if (validatedData.reportType === "salary") {
      const startDate = new Date(validatedData.dateRange.startDate)
      const endDate = new Date(validatedData.dateRange.endDate)

      let userQuery: any = {
        companyId: user.companyId,
        isActive: true,
      }

      if (validatedData.filters.role && validatedData.filters.role !== "all") {
        userQuery.role = validatedData.filters.role
      }

      const employees = await User.find(userQuery).select("name email role")
      const employeeIds = employees.map((e) => e._id)

      const payslips = await Payslip.find({
        companyId: user.companyId,
        userId: { $in: employeeIds },
        year: { $gte: startDate.getFullYear(), $lte: endDate.getFullYear() },
      }).populate("userId", "name email")

      const reportDataArray = employees.map((employee) => {
        const empPayslips = payslips.filter(
          (p) => (p.userId as any)._id.toString() === employee._id.toString()
        )
        const totalGross = empPayslips.reduce((sum, p) => sum + p.grossPay, 0)
        const totalNet = empPayslips.reduce((sum, p) => sum + p.netPay, 0)

        return {
          employeeName: employee.name,
          email: employee.email,
          role: employee.role,
          payslips: empPayslips.length,
          totalGrossPay: totalGross,
          totalNetPay: totalNet,
        }
      })

      reportData = {
        summary: {
          totalEmployees: employees.length,
          totalGrossPay: reportDataArray.reduce((sum, e) => sum + e.totalGrossPay, 0),
          totalNetPay: reportDataArray.reduce((sum, e) => sum + e.totalNetPay, 0),
        },
        data: reportDataArray,
      }
    } else if (validatedData.reportType === "leave") {
      const startDate = new Date(validatedData.dateRange.startDate)
      const endDate = new Date(validatedData.dateRange.endDate)

      let userQuery: any = {
        companyId: user.companyId,
        isActive: true,
      }

      if (user.role === "team_lead") {
        userQuery.managerId = user.id
      }

      if (validatedData.filters.role && validatedData.filters.role !== "all") {
        userQuery.role = validatedData.filters.role
      }

      const employees = await User.find(userQuery).select("name email role")
      const employeeIds = employees.map((e) => e._id)

      const leaves = await Leave.find({
        userId: { $in: employeeIds },
        fromDate: { $lte: endDate },
        toDate: { $gte: startDate },
      })

      const reportDataArray = employees.map((employee) => {
        const empLeaves = leaves.filter(
          (l) => l.userId.toString() === employee._id.toString()
        )
        const approved = empLeaves
          .filter((l) => l.status === "approved")
          .reduce((sum, l) => sum + l.numberOfDays, 0)
        const rejected = empLeaves
          .filter((l) => l.status === "rejected")
          .reduce((sum, l) => sum + l.numberOfDays, 0)

        return {
          employeeName: employee.name,
          email: employee.email,
          role: employee.role,
          totalRequested: empLeaves.reduce((sum, l) => sum + l.numberOfDays, 0),
          approved,
          rejected,
          pending: empLeaves
            .filter((l) => l.status === "pending")
            .reduce((sum, l) => sum + l.numberOfDays, 0),
        }
      })

      reportData = {
        summary: {
          total: reportDataArray.reduce((sum, e) => sum + e.totalRequested, 0),
          approved: reportDataArray.reduce((sum, e) => sum + e.approved, 0),
          rejected: reportDataArray.reduce((sum, e) => sum + e.rejected, 0),
        },
        data: reportDataArray,
      }
    }

    if (!reportData) {
      return NextResponse.json(
        { error: "Failed to generate report data" },
        { status: 500 }
      )
    }

    // Generate export based on format
    if (validatedData.format === "excel" || validatedData.format === "csv") {
      // Prepare data for Excel/CSV
      let worksheetData: any[] = []

      if (validatedData.reportType === "attendance") {
        worksheetData = reportData.data.map((emp: any) => ({
          "Employee Name": emp.employeeName,
          "Email": emp.employeeEmail,
          "Role": emp.role,
          "Present Days": emp.presentDays,
          "Absent Days": emp.absentDays,
          "Half Days": emp.halfDays,
          "Leave Days": emp.leaveDays,
          "Total Hours": emp.totalHours,
          "Average Hours": emp.averageHours,
          "Late Arrivals": emp.lateArrivals,
          "Early Departures": emp.earlyDepartures,
          "Attendance %": emp.attendancePercentage,
        }))
      } else if (validatedData.reportType === "salary") {
        worksheetData = reportData.data.map((emp: any) => ({
          "Employee Name": emp.employeeName,
          "Email": emp.employeeEmail,
          "Role": emp.role,
          "Payslips": emp.payslips.length,
          "Gross Pay": emp.totalGrossPay,
          "Deductions": emp.totalDeductions,
          "Net Pay": emp.totalNetPay,
          "Overtime Pay": emp.totalOvertimePay,
        }))
      } else if (validatedData.reportType === "leave") {
        worksheetData = reportData.data.map((emp: any) => ({
          "Employee Name": emp.employeeName,
          "Email": emp.employeeEmail,
          "Role": emp.role,
          "Total Requested": emp.totalRequested,
          "Approved": emp.totalApproved,
          "Rejected": emp.totalRejected,
          "Pending": emp.totalPending,
        }))
      }

      const worksheet = XLSX.utils.json_to_sheet(worksheetData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report")

      if (validatedData.format === "csv") {
        const csv = XLSX.utils.sheet_to_csv(worksheet)
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${validatedData.reportType}-report.csv"`,
          },
        })
      } else {
        const excelBuffer = XLSX.write(workbook, {
          type: "buffer",
          bookType: "xlsx",
        })

        return new NextResponse(excelBuffer, {
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${validatedData.reportType}-report.xlsx"`,
          },
        })
      }
    } else if (validatedData.format === "pdf") {
      // Generate PDF
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 20
      let yPos = margin

      // Title
      doc.setFontSize(18)
      doc.setFont("helvetica", "bold")
      doc.text(
        `${validatedData.reportType.charAt(0).toUpperCase() + validatedData.reportType.slice(1)} Report`,
        margin,
        yPos
      )
      yPos += 10

      // Period
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text(
        `Period: ${validatedData.dateRange.startDate} to ${validatedData.dateRange.endDate}`,
        margin,
        yPos
      )
      yPos += 15

      // Summary
      if (reportData.summary) {
        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        doc.text("Summary", margin, yPos)
        yPos += 8

        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        Object.entries(reportData.summary).forEach(([key, value]) => {
          if (typeof value === "number" || typeof value === "string") {
            doc.text(`${key}: ${value}`, margin, yPos)
            yPos += 6
          }
        })
        yPos += 10
      }

      // Data table
      if (reportData.data && reportData.data.length > 0) {
        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        doc.text("Details", margin, yPos)
        yPos += 8

        // Table headers
        const headers = Object.keys(reportData.data[0]).filter(
          (key) => key !== "employeeId" && key !== "employeeEmail"
        )
        const colWidth = (pageWidth - 2 * margin) / Math.min(headers.length, 5)

        doc.setFontSize(8)
        headers.slice(0, 5).forEach((header, index) => {
          doc.text(
            header,
            margin + index * colWidth,
            yPos,
            { maxWidth: colWidth - 5 }
          )
        })
        yPos += 8

        // Table rows
        reportData.data.slice(0, 20).forEach((row: any) => {
          if (yPos > doc.internal.pageSize.getHeight() - 30) {
            doc.addPage()
            yPos = margin
          }

          headers.slice(0, 5).forEach((header, index) => {
            const value = String(row[header] || "")
            doc.text(
              value.length > 15 ? value.substring(0, 15) + "..." : value,
              margin + index * colWidth,
              yPos,
              { maxWidth: colWidth - 5 }
            )
          })
          yPos += 6
        })
      }

      const pdfBuffer = Buffer.from(doc.output("arraybuffer"))
      return new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${validatedData.reportType}-report.pdf"`,
        },
      })
    }

    return NextResponse.json({ error: "Invalid format" }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error exporting report:", error)
    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 }
    )
  }
}

