import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import { exportToExcel, exportToCSV, employeeExportColumns } from "@/lib/exportUtils"
import { format as formatDate } from "date-fns"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only HR and admins can export employee data
    if (
      user.role !== "hr_manager" &&
      user.role !== "primary_admin" &&
      user.role !== "secondary_admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "excel"
    const department = searchParams.get("department")

    await connectDB()

    // Build query
    const query: any = {
      companyId: user.companyId,
      role: "employee",
    }

    if (department) {
      query.department = department
    }

    // Fetch employees
    const employees = await User.find(query)
      .populate("managerId", "name")
      .sort({ name: 1 })
      .lean()

    // Format data for export
    const exportData = employees.map((emp: any) => ({
      name: emp.name || "N/A",
      email: emp.email || "N/A",
      phone: emp.phone || "N/A",
      employeeId: emp.employeeId || emp._id.toString(),
      role: emp.role || "employee",
      department: emp.department || "N/A",
      jobTitle: emp.jobRole || "N/A",
      managerName: emp.managerId?.name || "N/A",
      status: emp.isActive ? "Active" : "Inactive",
      joinDate: emp.createdAt || null,
    }))

    // Return data for client-side export
    const filename = `employees-export-${formatDate(new Date(), "yyyy-MM-dd")}`
    
    return NextResponse.json({
      success: true,
      message: "Export ready",
      filename,
      format,
      data: exportData,
      columns: employeeExportColumns.map((col) => ({
        key: col.key,
        header: col.header,
        width: col.width,
        format: col.format ? "date" : undefined,
      })),
    })
  } catch (error: any) {
    console.error("Error exporting employees:", error)
    return NextResponse.json(
      { error: error.message || "Failed to export employees" },
      { status: 500 }
    )
  }
}

