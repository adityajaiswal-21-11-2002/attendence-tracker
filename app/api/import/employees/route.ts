import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import {
  parseExcelFile,
  parseCSVFile,
  validateRequiredFields,
  validateEmails,
  validateDates,
  validateImportData,
  normalizeFieldNames,
} from "@/lib/importUtils"
import { hashPassword } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only HR and admins can import employees
    if (
      user.role !== "hr_manager" &&
      user.role !== "primary_admin" &&
      user.role !== "secondary_admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const preview = formData.get("preview") === "true"

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Parse file
    let data: any[]
    const fileExtension = file.name.split(".").pop()?.toLowerCase()

    if (fileExtension === "xlsx" || fileExtension === "xls") {
      data = await parseExcelFile(file)
    } else if (fileExtension === "csv") {
      data = await parseCSVFile(file)
    } else {
      return NextResponse.json(
        { error: "Unsupported file format. Please use CSV or Excel." },
        { status: 400 }
      )
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: "File is empty" },
        { status: 400 }
      )
    }

    // Normalize field names
    data = normalizeFieldNames(data)

    // Field mapping (common variations)
    const fieldMapping: Record<string, string> = {
      name: "name",
      full_name: "name",
      employee_name: "name",
      email: "email",
      email_address: "email",
      phone: "phone",
      phone_number: "phone",
      mobile: "phone",
      employee_id: "employeeid",
      emp_id: "employeeid",
      id: "employeeid",
      department: "department",
      dept: "department",
      job_title: "jobtitle",
      position: "jobtitle",
      role: "role",
      manager: "manager",
      manager_name: "manager",
      join_date: "joindate",
      start_date: "joindate",
      password: "password",
    }

    // Map fields
    data = data.map((row) => {
      const mapped: any = {}
      Object.keys(row).forEach((key) => {
        const mappedKey = fieldMapping[key.toLowerCase()] || key.toLowerCase()
        mapped[mappedKey] = row[key]
      })
      return mapped
    })

    // Validate data
    const requiredFields = ["name", "email"]
    const validationErrors = [
      ...validateRequiredFields(data, requiredFields, fieldMapping),
      ...validateEmails(data, "email", fieldMapping),
    ]

    // Group errors by row
    const errorsByRow: Record<number, any[]> = {}
    validationErrors.forEach((error) => {
      if (!errorsByRow[error.row]) {
        errorsByRow[error.row] = []
      }
      errorsByRow[error.row].push(error)
    })

    // Separate valid and invalid rows
    const validRows: any[] = []
    const invalidRows: Array<{ row: number; data: any; errors: any[] }> = []

    data.forEach((row, index) => {
      const rowNumber = index + 2
      if (errorsByRow[rowNumber]) {
        invalidRows.push({
          row: rowNumber,
          data: row,
          errors: errorsByRow[rowNumber],
        })
      } else {
        validRows.push(row)
      }
    })

    // If preview, return validation results
    if (preview) {
      return NextResponse.json({
        success: true,
        preview: true,
        totalRows: data.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        invalid: invalidRows,
        sample: validRows.slice(0, 5),
      })
    }

    // Import valid rows
    await connectDB()

    const imported: any[] = []
    const failed: any[] = []

    for (const row of validRows) {
      try {
        // Check if employee already exists
        const existing = await User.findOne({
          email: row.email,
          companyId: user.companyId,
        })

        if (existing) {
          failed.push({
            row: row,
            error: "Employee with this email already exists",
          })
          continue
        }

        // Create employee
        const password = row.password || "DefaultPassword123!"
        const hashedPassword = await hashPassword(password)

        const employee = await User.create({
          name: row.name,
          email: row.email,
          phone: row.phone,
          employeeId: row.employeeid || undefined,
          password: hashedPassword,
          role: "employee",
          companyId: user.companyId,
          department: row.department,
          jobRole: row.jobtitle,
          managerId: row.manager ? await findManagerByName(row.manager, user.companyId) : undefined,
          isActive: true,
        })

        imported.push({
          id: employee._id,
          name: employee.name,
          email: employee.email,
        })
      } catch (error: any) {
        failed.push({
          row: row,
          error: error.message || "Failed to import",
        })
      }
    }

    return NextResponse.json({
      success: true,
      imported: imported.length,
      failed: failed.length,
      importedEmployees: imported,
      failedRows: failed,
    })
  } catch (error: any) {
    console.error("Error importing employees:", error)
    return NextResponse.json(
      { error: error.message || "Failed to import employees" },
      { status: 500 }
    )
  }
}

async function findManagerByName(name: string, companyId: string) {
  const manager = await User.findOne({
    name: { $regex: new RegExp(name, "i") },
    companyId,
    role: { $in: ["team_lead", "operations_manager", "hr_manager"] },
  })
  return manager?._id
}

