import jsPDF from "jspdf"
import { format } from "date-fns"

/**
 * PDF Export Utilities
 */

/**
 * Export table data to PDF
 */
export function exportTableToPDF(
  title: string,
  headers: string[],
  data: any[][],
  filename: string = "export.pdf",
  companyName?: string,
  companyAddress?: string
): void {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const tableStartY = companyName ? 50 : 30
  let currentY = tableStartY

  // Company header
  if (companyName) {
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text(companyName, margin, 20)
    
    if (companyAddress) {
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text(companyAddress, margin, 28)
    }
    
    currentY = 35
  }

  // Title
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text(title, margin, currentY)
  currentY += 10

  // Date
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Generated on: ${format(new Date(), "MMM dd, yyyy HH:mm")}`, margin, currentY)
  currentY += 15

  // Calculate column widths
  const numColumns = headers.length
  const columnWidth = (pageWidth - 2 * margin) / numColumns

  // Table header
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  headers.forEach((header, index) => {
    const x = margin + index * columnWidth
    doc.rect(x, currentY, columnWidth, 8, "F")
    doc.setTextColor(255, 255, 255)
    doc.text(header, x + 2, currentY + 6)
    doc.setTextColor(0, 0, 0)
  })
  currentY += 8

  // Table data
  doc.setFont("helvetica", "normal")
  data.forEach((row) => {
    // Check if we need a new page
    if (currentY + 8 > pageHeight - margin) {
      doc.addPage()
      currentY = margin
    }

    row.forEach((cell, index) => {
      const x = margin + index * columnWidth
      const cellText = String(cell || "").substring(0, 20) // Truncate long text
      doc.text(cellText, x + 2, currentY + 6)
    })
    currentY += 8
  })

  // Save PDF
  doc.save(filename)
}

/**
 * Export report to PDF
 */
export function exportReportToPDF(
  reportTitle: string,
  sections: Array<{
    title: string
    data: Array<{ label: string; value: string | number }>
  }>,
  filename: string = "report.pdf",
  companyName?: string
): void {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  let currentY = margin

  // Company header
  if (companyName) {
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text(companyName, margin, currentY)
    currentY += 10
  }

  // Report title
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text(reportTitle, margin, currentY)
  currentY += 10

  // Date
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(`Generated on: ${format(new Date(), "MMM dd, yyyy HH:mm")}`, margin, currentY)
  currentY += 15

  // Sections
  sections.forEach((section) => {
    // Check if we need a new page
    if (currentY + 30 > pageHeight - margin) {
      doc.addPage()
      currentY = margin
    }

    // Section title
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text(section.title, margin, currentY)
    currentY += 8

    // Section data
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    section.data.forEach((item) => {
      if (currentY + 8 > pageHeight - margin) {
        doc.addPage()
        currentY = margin
      }
      doc.text(`${item.label}:`, margin, currentY)
      doc.text(String(item.value), margin + 60, currentY)
      currentY += 7
    })

    currentY += 5
  })

  // Save PDF
  doc.save(filename)
}

/**
 * Export attendance summary to PDF
 */
export function exportAttendanceSummaryToPDF(
  summary: {
    totalEmployees: number
    present: number
    absent: number
    onLeave: number
    late: number
  },
  period: string,
  filename: string = "attendance-summary.pdf",
  companyName?: string
): void {
  exportReportToPDF(
    "Attendance Summary",
    [
      {
        title: "Period",
        data: [{ label: "Period", value: period }],
      },
      {
        title: "Summary",
        data: [
          { label: "Total Employees", value: summary.totalEmployees },
          { label: "Present", value: summary.present },
          { label: "Absent", value: summary.absent },
          { label: "On Leave", value: summary.onLeave },
          { label: "Late", value: summary.late },
        ],
      },
    ],
    filename,
    companyName
  )
}

