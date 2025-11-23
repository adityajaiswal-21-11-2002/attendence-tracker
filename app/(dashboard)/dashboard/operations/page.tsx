import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Clock,
  Users,
  FileText,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Attendance from "@/models/Attendance"
import Roster from "@/models/Roster"
import { format, startOfDay, endOfDay } from "date-fns"

async function getOperationsStats(userId: string, companyId: string) {
  try {
    await connectDB()

    // Get employees (operations manager can see all)
    const employees = await User.find({
      companyId,
      role: "employee",
      isActive: true,
    }).select("_id")

    const employeeIds = employees.map((e) => e._id)

    // Today's attendance
    const today = new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)

    const todayAttendance = await Attendance.find({
      userId: { $in: employeeIds },
      date: { $gte: todayStart, $lte: todayEnd },
    })

    const presentToday = todayAttendance.filter((a) => a.status === "present").length
    const absentToday = todayAttendance.filter((a) => a.status === "absent").length
    const onLeaveToday = todayAttendance.filter((a) => a.status === "leave").length

    // Active employees (logged in)
    const activeEmployees = todayAttendance.filter(
      (a) => a.status === "present" && a.loginTime && !a.logoutTime
    ).length

    // Upcoming rosters (next 7 days)
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    const upcomingRosters = await Roster.countDocuments({
      companyId,
      date: { $gte: today, $lte: nextWeek },
    })

    // Pending leave requests
    const Leave = (await import("@/models/Leave")).default
    const pendingLeaves = await Leave.countDocuments({
      companyId,
      status: "pending",
    })

    return {
      totalEmployees: employees.length,
      presentToday,
      absentToday,
      onLeaveToday,
      activeEmployees,
      upcomingRosters,
      pendingLeaves,
    }
  } catch (error) {
    console.error("Error fetching operations stats:", error)
    return {
      totalEmployees: 0,
      presentToday: 0,
      absentToday: 0,
      onLeaveToday: 0,
      activeEmployees: 0,
      upcomingRosters: 0,
      pendingLeaves: 0,
    }
  }
}

export default async function OperationsDashboard() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  if (
    user.role !== "operations_manager" &&
    user.role !== "primary_admin" &&
    user.role !== "secondary_admin"
  ) {
    redirect("/dashboard")
  }

  const stats = await getOperationsStats(user.id, user.companyId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Operations Manager Dashboard</h1>
        <p className="text-muted-foreground">
          Manage rosters, track attendance, and oversee operations
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.presentToday}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeEmployees} currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.absentToday}</div>
            <p className="text-xs text-muted-foreground">
              {stats.onLeaveToday} on leave
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Rosters</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingRosters}</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Roster Management
            </CardTitle>
            <CardDescription>Create and manage employee rosters</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/operations/roster">
              <Button className="w-full">
                Manage Rosters
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Attendance Tracker
            </CardTitle>
            <CardDescription>View and manage employee attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/operations/attendance">
              <Button className="w-full">
                View Attendance
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Live Employee Status
            </CardTitle>
            <CardDescription>Real-time employee activity</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/operations/attendance">
              <Button variant="outline" className="w-full">
                View Live Status
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Reports & Analytics
            </CardTitle>
            <CardDescription>Generate operational reports</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/reports">
              <Button className="w-full">
                View Reports
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Task Assignment
            </CardTitle>
            <CardDescription>Assign and track tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/operations/roster/tasks">
              <Button className="w-full">
                Manage Tasks
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Leave Approval
            </CardTitle>
            <CardDescription>Review and approve leave requests</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.pendingLeaves > 0 ? (
              <Link href="/dashboard/operations/leaves">
                <Button variant="default" className="w-full">
                  Review Leaves ({stats.pendingLeaves})
                </Button>
              </Link>
            ) : (
              <Link href="/dashboard/operations/leaves">
                <Button variant="outline" className="w-full">
                  View Leaves
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

