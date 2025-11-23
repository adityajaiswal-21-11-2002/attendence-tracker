import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Roster from "@/models/Roster"
import User from "@/models/User"
import { exportToExcel, exportToCSV, rosterExportColumns } from "@/lib/exportUtils"
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

    await connectDB()

    // Build query
    const query: any = { companyId: user.companyId }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      }
    }

    // Fetch roster records
    const rosterRecords = await Roster.find(query)
      .populate("userId", "name employeeId")
      .sort({ date: 1 })
      .lean()

    // Format data for export
    const exportData = rosterRecords.map((record: any) => ({
      employeeName: record.userId?.name || "N/A",
      employeeId: record.userId?.employeeId || record.userId?._id || "N/A",
      date: record.date,
      shiftType: record.shiftType || "N/A",
      startTime: record.shiftTime?.start || "N/A",
      endTime: record.shiftTime?.end || "N/A",
      location: record.location || "N/A",
      status: record.status || "scheduled",
    }))

    // Return data for client-side export
    const filename = `roster-export-${formatDate(new Date(), "yyyy-MM-dd")}`
    
    return NextResponse.json({
      success: true,
      message: "Export ready",
      filename,
      format,
      data: exportData,
      columns: rosterExportColumns.map((col) => ({
        key: col.key,
        header: col.header,
        width: col.width,
        format: col.format ? "date" : undefined,
      })),
    })
  } catch (error: any) {
    console.error("Error exporting roster:", error)
    return NextResponse.json(
      { error: error.message || "Failed to export roster" },
      { status: 500 }
    )
  }
}

