import { getCurrentUser, getRedirectPath } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Clock,
  Calendar,
  DollarSign,
  Bell,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
import connectDB from "@/lib/mongodb"
import Attendance from "@/models/Attendance"
import LeaveBalance from "@/models/LeaveBalance"
import Payslip from "@/models/Payslip"
import Notification from "@/models/Notification"
import Roster from "@/models/Roster"
import { format, startOfDay, endOfDay } from "date-fns"

async function getEmployeeStats(userId: string, companyId: string) {
  try {
    await connectDB()

    // Today's attendance
    const today = new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)

    const todayAttendance = await Attendance.findOne({
      userId,
      date: { $gte: todayStart, $lte: todayEnd },
    })

    const isLoggedIn = todayAttendance?.loginTime && !todayAttendance?.logoutTime
    const attendanceStatus = todayAttendance?.status || "absent"

    // Leave balance
    const currentYear = new Date().getFullYear()
    const leaveBalance = await LeaveBalance.findOne({
      userId,
      companyId,
      year: currentYear,
    })

    // Current month payslip
    const currentMonth = new Date().getMonth() + 1
    const currentPayslip = await Payslip.findOne({
      userId,
      month: currentMonth,
      year: currentYear,
    })

    // Unread notifications
    const unreadNotifications = await Notification.countDocuments({
      userId,
      companyId,
      isRead: false,
    })

    // Upcoming roster (next 7 days)
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    const upcomingRosters = await Roster.find({
      userId,
      date: { $gte: today, $lte: nextWeek },
    })
      .sort({ date: 1 })
      .limit(5)

    return {
      isLoggedIn,
      attendanceStatus,
      leaveBalance: leaveBalance
        ? {
            earned: leaveBalance.earnedLeave,
            sick: leaveBalance.sickLeave,
            compOff: leaveBalance.compOff,
            casual: leaveBalance.casualLeave,
          }
        : null,
      currentPayslip: currentPayslip
        ? {
            netPay: currentPayslip.netPay,
            month: currentPayslip.month,
            year: currentPayslip.year,
          }
        : null,
      unreadNotifications,
      upcomingRosters: upcomingRosters.map((r) => ({
        date: r.date,
        shiftType: r.shiftType,
        shiftTime: r.shiftTime,
      })),
    }
  } catch (error) {
    console.error("Error fetching employee stats:", error)
    return {
      isLoggedIn: false,
      attendanceStatus: "absent",
      leaveBalance: null,
      currentPayslip: null,
      unreadNotifications: 0,
      upcomingRosters: [],
    }
  }
}

export default async function EmployeeDashboard() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      redirect("/login")
    }

    // Redirect non-employees to their role-specific dashboard
    if (user.role !== "employee") {
      const redirectPath = getRedirectPath(user.role)
      redirect(redirectPath)
    }

    const stats = await getEmployeeStats(user.id, user.companyId)

    return (
      <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.name}! Here&apos;s your overview
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Status</CardTitle>
            {stats.isLoggedIn ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{stats.attendanceStatus}</div>
            <p className="text-xs text-muted-foreground">
              {stats.isLoggedIn ? "Currently logged in" : "Not logged in"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leave Balance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.leaveBalance ? (
              <div className="text-2xl font-bold">
                {stats.leaveBalance.earned + stats.leaveBalance.sick + stats.leaveBalance.compOff + stats.leaveBalance.casual}
              </div>
            ) : (
              <div className="text-2xl font-bold">-</div>
            )}
            <p className="text-xs text-muted-foreground">Total available days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Salary</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.currentPayslip ? (
              <div className="text-2xl font-bold">
                ₹{stats.currentPayslip.netPay.toLocaleString()}
              </div>
            ) : (
              <div className="text-2xl font-bold">-</div>
            )}
            <p className="text-xs text-muted-foreground">
              {stats.currentPayslip
                ? format(new Date(stats.currentPayslip.year, stats.currentPayslip.month - 1, 1), "MMM yyyy")
                : "Not generated"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unreadNotifications}</div>
            <p className="text-xs text-muted-foreground">Unread notifications</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Attendance Panel
            </CardTitle>
            <CardDescription>Mark your attendance and track hours</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/employee/attendance">
              <Button className="w-full">
                {stats.isLoggedIn ? "View Attendance" : "Mark Attendance"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              My Roster
            </CardTitle>
            <CardDescription>View your scheduled shifts</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/employee/attendance">
              <Button className="w-full">
                View Roster
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Leave Management
            </CardTitle>
            <CardDescription>Apply for leaves and view balance</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/employee/leaves">
              <Button className="w-full">
                Manage Leaves
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Salary View
            </CardTitle>
            <CardDescription>View your salary and download payslips</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/employee/salary">
              <Button className="w-full">
                View Salary
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>View your notifications</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.unreadNotifications > 0 ? (
              <Link href="/dashboard/notifications">
                <Button variant="default" className="w-full">
                  View Notifications ({stats.unreadNotifications})
                </Button>
              </Link>
            ) : (
              <Link href="/dashboard/notifications">
                <Button variant="outline" className="w-full">
                  View Notifications
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Roster */}
      {stats.upcomingRosters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Roster</CardTitle>
            <CardDescription>Your scheduled shifts for the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.upcomingRosters.map((roster, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {format(new Date(roster.date), "EEEE, MMMM dd, yyyy")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {roster.shiftType} • {roster.shiftTime.start} - {roster.shiftTime.end}
                    </p>
                  </div>
                  <Badge variant="outline">{roster.shiftType}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave Balance Details */}
      {stats.leaveBalance && (
        <Card>
          <CardHeader>
            <CardTitle>Leave Balance</CardTitle>
            <CardDescription>Your available leave days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Earned Leave</p>
                <p className="text-2xl font-bold">{stats.leaveBalance.earned}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Sick Leave</p>
                <p className="text-2xl font-bold">{stats.leaveBalance.sick}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Comp Off</p>
                <p className="text-2xl font-bold">{stats.leaveBalance.compOff}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Casual Leave</p>
                <p className="text-2xl font-bold">{stats.leaveBalance.casual}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    )
  } catch (error) {
    console.error("Error in EmployeeDashboard:", error)
    // Log the full error for debugging
    if (error instanceof Error) {
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    }
    // If there's an error, redirect to dashboard which will handle the redirect
    redirect("/dashboard")
  }
}

