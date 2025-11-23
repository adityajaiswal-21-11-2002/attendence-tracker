import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Attendance from "@/models/Attendance"
import { startOfDay, endOfDay, format } from "date-fns"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (
      !user ||
      (user.role !== "operations_manager" &&
        user.role !== "hr_manager" &&
        user.role !== "primary_admin" &&
        user.role !== "secondary_admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get("date")
    const formatType = searchParams.get("format") || "csv"

    await connectDB()

    const targetDate = dateParam ? new Date(dateParam) : new Date()
    const dayStart = startOfDay(targetDate)
    const dayEnd = endOfDay(targetDate)

    const attendances = await Attendance.find({
      companyId: user.companyId,
      date: {
        $gte: dayStart,
        $lte: dayEnd,
      },
    })
      .populate("userId", "name email role")
      .sort({ date: 1 })
      .lean()

    if (formatType === "csv") {
      // Generate CSV
      const headers = [
        "Date",
        "Employee Name",
        "Email",
        "Role",
        "Login Time",
        "Logout Time",
        "Total Hours",
        "Status",
        "Breaks",
      ]

      const rows = attendances.map((att: any) => {
        const breaks = att.breaks
          ?.map(
            (b: any) =>
              `${format(new Date(b.breakIn), "HH:mm")}-${
                b.breakOut ? format(new Date(b.breakOut), "HH:mm") : "Ongoing"
              }`
          )
          .join("; ") || "None"

        return [
          format(new Date(att.date), "yyyy-MM-dd"),
          att.userId?.name || "N/A",
          att.userId?.email || "N/A",
          att.userId?.role?.replace("_", " ") || "N/A",
          att.loginTime ? format(new Date(att.loginTime), "HH:mm:ss") : "N/A",
          att.logoutTime ? format(new Date(att.logoutTime), "HH:mm:ss") : "N/A",
          att.totalHours?.toFixed(2) || "0.00",
          att.status || "N/A",
          breaks,
        ]
      })

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n")

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="attendance-${format(
            targetDate,
            "yyyy-MM-dd"
          )}.csv"`,
        },
      })
    }

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 })
  } catch (error) {
    console.error("Error exporting attendance:", error)
    return NextResponse.json(
      { error: "Failed to export attendance" },
      { status: 500 }
    )
  }
}

