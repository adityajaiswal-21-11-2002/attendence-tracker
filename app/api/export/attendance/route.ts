import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Attendance from "@/models/Attendance"
import User from "@/models/User"
import { exportToExcel, exportToCSV, attendanceExportColumns } from "@/lib/exportUtils"
import { format as formatDate } from "date-fns"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "excel"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const employeeId = searchParams.get("employeeId")

    await connectDB()

    // Build query
    const query: any = { companyId: user.companyId }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      }
    }

    if (employeeId) {
      query.userId = employeeId
    }

    // Fetch attendance records
    const attendanceRecords = await Attendance.find(query)
      .populate("userId", "name email employeeId")
      .sort({ date: -1 })
      .lean()

    // Format data for export
    const exportData = attendanceRecords.map((record: any) => ({
      employeeName: record.userId?.name || "N/A",
      employeeId: record.userId?.employeeId || record.userId?._id || "N/A",
      date: record.date,
      status: record.status,
      loginTime: record.loginTime || null,
      logoutTime: record.logoutTime || null,
      hoursWorked: record.hoursWorked || 0,
      location: record.location || "N/A",
    }))

    // Return data for client-side export
    const filename = `attendance-export-${formatDate(new Date(), "yyyy-MM-dd")}`
    
    return NextResponse.json({
      success: true,
      message: "Export ready",
      filename,
      format,
      data: exportData,
      columns: attendanceExportColumns.map((col) => ({
        key: col.key,
        header: col.header,
        width: col.width,
        format: col.format ? "date" : undefined,
      })),
    })
  } catch (error: any) {
    console.error("Error exporting attendance:", error)
    return NextResponse.json(
      { error: error.message || "Failed to export attendance" },
      { status: 500 }
    )
  }
}

