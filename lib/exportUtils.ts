import * as XLSX from "xlsx"
import { format } from "date-fns"

/**
 * Excel Export Utilities
 */

export interface ExcelColumn {
  header: string
  key: string
  width?: number
  format?: (value: any) => string
}

export interface ExcelSheet {
  name: string
  data: any[]
  columns: ExcelColumn[]
}

/**
 * Export data to Excel file
 */
export function exportToExcel(
  sheets: ExcelSheet[],
  filename: string = "export.xlsx"
): void {
  const workbook = XLSX.utils.book_new()

  sheets.forEach((sheet) => {
    // Prepare data with headers
    const worksheetData = [
      sheet.columns.map((col) => col.header),
      ...sheet.data.map((row) =>
        sheet.columns.map((col) => {
          const value = row[col.key]
          return col.format ? col.format(value) : value ?? ""
        })
      ),
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

    // Set column widths
    const colWidths = sheet.columns.map((col) => ({
      wch: col.width || 15,
    }))
    worksheet["!cols"] = colWidths

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name)
  })

  // Write file
  XLSX.writeFile(workbook, filename)
}

/**
 * Export single sheet to Excel
 */
export function exportSingleSheetToExcel(
  data: any[],
  columns: ExcelColumn[],
  sheetName: string = "Sheet1",
  filename: string = "export.xlsx"
): void {
  exportToExcel([{ name: sheetName, data, columns }], filename)
}

/**
 * Format date for Excel
 */
export function formatDateForExcel(date: Date | string | null | undefined): string {
  if (!date) return ""
  try {
    return format(new Date(date), "yyyy-MM-dd")
  } catch {
    return String(date)
  }
}

/**
 * Format datetime for Excel
 */
export function formatDateTimeForExcel(
  date: Date | string | null | undefined
): string {
  if (!date) return ""
  try {
    return format(new Date(date), "yyyy-MM-dd HH:mm:ss")
  } catch {
    return String(date)
  }
}

/**
 * Format currency for Excel
 */
export function formatCurrencyForExcel(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "0.00"
  return amount.toFixed(2)
}

/**
 * CSV Export Utilities
 */

/**
 * Convert array of objects to CSV string
 */
export function convertToCSV(
  data: any[],
  columns: { key: string; header: string }[]
): string {
  if (data.length === 0) {
    return columns.map((col) => col.header).join(",")
  }

  // Escape CSV values
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return ""
    const str = String(value)
    // If contains comma, quote, or newline, wrap in quotes and escape quotes
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  // Header row
  const headerRow = columns.map((col) => escapeCSV(col.header)).join(",")

  // Data rows
  const dataRows = data.map((row) =>
    columns.map((col) => escapeCSV(row[col.key] ?? "")).join(",")
  )

  return [headerRow, ...dataRows].join("\n")
}

/**
 * Download CSV file
 */
export function downloadCSV(
  csvContent: string,
  filename: string = "export.csv"
): void {
  // Add BOM for UTF-8 encoding
  const BOM = "\uFEFF"
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export data to CSV
 */
export function exportToCSV(
  data: any[],
  columns: { key: string; header: string }[],
  filename: string = "export.csv"
): void {
  const csvContent = convertToCSV(data, columns)
  downloadCSV(csvContent, filename)
}

/**
 * Common export column definitions
 */

export const attendanceExportColumns: ExcelColumn[] = [
  { header: "Employee Name", key: "employeeName", width: 20 },
  { header: "Employee ID", key: "employeeId", width: 15 },
  { header: "Date", key: "date", width: 12, format: formatDateForExcel },
  { header: "Status", key: "status", width: 12 },
  { header: "Login Time", key: "loginTime", width: 15, format: formatDateTimeForExcel },
  { header: "Logout Time", key: "logoutTime", width: 15, format: formatDateTimeForExcel },
  { header: "Hours Worked", key: "hoursWorked", width: 12 },
  { header: "Location", key: "location", width: 20 },
]

export const employeeExportColumns: ExcelColumn[] = [
  { header: "Name", key: "name", width: 20 },
  { header: "Email", key: "email", width: 25 },
  { header: "Phone", key: "phone", width: 15 },
  { header: "Employee ID", key: "employeeId", width: 15 },
  { header: "Role", key: "role", width: 15 },
  { header: "Department", key: "department", width: 15 },
  { header: "Job Title", key: "jobTitle", width: 20 },
  { header: "Manager", key: "managerName", width: 20 },
  { header: "Status", key: "status", width: 12 },
  { header: "Join Date", key: "joinDate", width: 12, format: formatDateForExcel },
]

export const rosterExportColumns: ExcelColumn[] = [
  { header: "Employee Name", key: "employeeName", width: 20 },
  { header: "Employee ID", key: "employeeId", width: 15 },
  { header: "Date", key: "date", width: 12, format: formatDateForExcel },
  { header: "Shift Type", key: "shiftType", width: 15 },
  { header: "Start Time", key: "startTime", width: 12 },
  { header: "End Time", key: "endTime", width: 12 },
  { header: "Location", key: "location", width: 20 },
  { header: "Status", key: "status", width: 12 },
]

