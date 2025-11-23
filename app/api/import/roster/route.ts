import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Roster from "@/models/Roster"
import User from "@/models/User"
import {
  parseExcelFile,
  parseCSVFile,
  validateRequiredFields,
  validateDates,
  normalizeFieldNames,
} from "@/lib/importUtils"

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only operations managers and team leads can import roster
    if (
      user.role !== "operations_manager" &&
      user.role !== "team_lead" &&
      user.role !== "primary_admin" &&
      user.role !== "secondary_admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const preview = formData.get("preview") === "true"
    const copyFromPeriod = formData.get("copyFromPeriod") === "true"
    const sourceMonth = formData.get("sourceMonth")
    const sourceYear = formData.get("sourceYear")
    const targetMonth = formData.get("targetMonth")
    const targetYear = formData.get("targetYear")

    await connectDB()

    let data: any[] = []

    // If copying from previous period
    if (copyFromPeriod && sourceMonth && sourceYear && targetMonth && targetYear) {
      const sourceDate = new Date(parseInt(sourceYear), parseInt(sourceMonth) - 1, 1)
      const targetDate = new Date(parseInt(targetYear), parseInt(targetMonth) - 1, 1)
      const endOfSourceMonth = new Date(parseInt(sourceYear), parseInt(sourceMonth), 0)
      const endOfTargetMonth = new Date(parseInt(targetYear), parseInt(targetMonth), 0)

      // Fetch source roster
      const sourceRoster = await Roster.find({
        companyId: user.companyId,
        date: {
          $gte: sourceDate,
          $lte: endOfSourceMonth,
        },
      })
        .populate("userId", "name employeeId")
        .lean()

      // Map to target period
      data = sourceRoster.map((roster: any) => {
        const sourceDay = new Date(roster.date).getDate()
        const targetDay = Math.min(sourceDay, endOfTargetMonth.getDate())
        const targetDate = new Date(parseInt(targetYear), parseInt(targetMonth) - 1, targetDay)

        return {
          employeename: roster.userId?.name || "",
          employeeid: roster.userId?.employeeId || roster.userId?._id?.toString() || "",
          date: targetDate.toISOString().split("T")[0],
          shifttype: roster.shiftType || "",
          starttime: roster.shiftTime?.start || "",
          endtime: roster.shiftTime?.end || "",
          location: roster.location || "",
        }
      })
    } else if (file) {
      // Parse uploaded file
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

      // Normalize field names
      data = normalizeFieldNames(data)
    } else {
      return NextResponse.json(
        { error: "No file or copy parameters provided" },
        { status: 400 }
      )
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: "No data to import" },
        { status: 400 }
      )
    }

    // Field mapping
    const fieldMapping: Record<string, string> = {
      employeename: "name",
      employee_name: "name",
      name: "name",
      employeeid: "employeeid",
      employee_id: "employeeid",
      emp_id: "employeeid",
      date: "date",
      shifttype: "shifttype",
      shift_type: "shifttype",
      starttime: "starttime",
      start_time: "starttime",
      endtime: "endtime",
      end_time: "endtime",
      location: "location",
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
    const requiredFields = ["name", "date"]
    const validationErrors = [
      ...validateRequiredFields(data, requiredFields, fieldMapping),
      ...validateDates(data, ["date"], fieldMapping),
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
    const imported: any[] = []
    const failed: any[] = []

    for (const row of validRows) {
      try {
        // Find employee
        const employee = await User.findOne({
          $or: [
            { name: { $regex: new RegExp(row.name, "i") }, companyId: user.companyId },
            { employeeId: row.employeeid, companyId: user.companyId },
          ],
        })

        if (!employee) {
          failed.push({
            row: row,
            error: `Employee not found: ${row.name}`,
          })
          continue
        }

        // Check if roster already exists
        const existing = await Roster.findOne({
          userId: employee._id,
          date: new Date(row.date),
          companyId: user.companyId,
        })

        if (existing) {
          // Update existing roster
          existing.shiftType = row.shifttype || existing.shiftType
          existing.shiftTime = {
            start: row.starttime || existing.shiftTime.start,
            end: row.endtime || existing.shiftTime.end,
          }
          existing.location = row.location || existing.location
          await existing.save()

          imported.push({
            id: existing._id,
            employeeName: employee.name,
            date: row.date,
            action: "updated",
          })
        } else {
          // Create new roster
          const roster = await Roster.create({
            userId: employee._id,
            companyId: user.companyId,
            date: new Date(row.date),
            shiftType: row.shifttype || "Regular",
            shiftTime: {
              start: row.starttime || "09:00",
              end: row.endtime || "18:00",
            },
            location: row.location || "",
            status: "scheduled",
          })

          imported.push({
            id: roster._id,
            employeeName: employee.name,
            date: row.date,
            action: "created",
          })
        }
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
      importedRosters: imported,
      failedRows: failed,
    })
  } catch (error: any) {
    console.error("Error importing roster:", error)
    return NextResponse.json(
      { error: error.message || "Failed to import roster" },
      { status: 500 }
    )
  }
}

