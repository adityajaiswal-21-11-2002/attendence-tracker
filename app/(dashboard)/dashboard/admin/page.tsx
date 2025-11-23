import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, CreditCard, TrendingUp, Users, Clock, Calendar, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import connectDB from "@/lib/mongodb"
import Company from "@/models/Company"
import User from "@/models/User"
import Attendance from "@/models/Attendance"
import Leave from "@/models/Leave"
import { format } from "date-fns"

async function getPrimaryAdminStats() {
  try {
    await connectDB()

    const totalCompanies = await Company.countDocuments()
    const activeSubscriptions = await Company.countDocuments({
      isActive: true,
      subscriptionExpiry: { $gte: new Date() },
    })
    const companies = await Company.find({ isActive: true }).lean()
    const totalRevenue = companies.reduce(
      (sum: number, company: any) => sum + (company.subscriptionPrice || 0),
      0
    )
    const totalAdmins = await User.countDocuments({
      role: { $in: ["primary_admin", "secondary_admin"] },
    })
    const recentCompanies = await Company.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name createdAt")
      .lean()

    const recentActivities = recentCompanies.map((company: any) => {
      const date = new Date(company.createdAt)
      const time = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      return {
        title: "New Company Created",
        description: `${company.name} was added to the system`,
        time,
      }
    })

    return {
      totalCompanies,
      activeSubscriptions,
      totalRevenue,
      totalAdmins,
      recentActivities,
    }
  } catch {
    return {
      totalCompanies: 0,
      activeSubscriptions: 0,
      totalRevenue: 0,
      totalAdmins: 0,
      recentActivities: [],
    }
  }
}

async function getSecondaryAdminStats(userId: string, companyId: string) {
  try {
    await connectDB()

    // Total employees
    const totalEmployees = await User.countDocuments({
      companyId,
      role: { $ne: "secondary_admin" },
      isActive: true,
    })

    // Today's attendance
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayAttendance = await Attendance.countDocuments({
      companyId,
      date: { $gte: today, $lt: tomorrow },
      status: "present",
    })

    const todayAbsent = await Attendance.countDocuments({
      companyId,
      date: { $gte: today, $lt: tomorrow },
      status: "absent",
    })

    // Pending leave requests
    const pendingLeaves = await Leave.countDocuments({
      companyId,
      status: "pending",
    })

    // Recent leave requests
    const recentLeaves = await Leave.find({
      companyId,
      status: "pending",
    })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()

    return {
      totalEmployees,
      todayAttendance,
      todayAbsent,
      pendingLeaves,
      recentLeaves: recentLeaves.map((leave: any) => ({
        title: "Leave Request",
        description: `${leave.userId.name} requested ${leave.numberOfDays} day(s) leave`,
        time: format(new Date(leave.createdAt), "MMM dd, yyyy"),
      })),
    }
  } catch {
    return {
      totalEmployees: 0,
      todayAttendance: 0,
      todayAbsent: 0,
      pendingLeaves: 0,
      recentLeaves: [],
    }
  }
}

export default async function AdminDashboard() {
  const user = await getCurrentUser()

  if (!user || (user.role !== "primary_admin" && user.role !== "secondary_admin")) {
    redirect("/dashboard")
  }

  const isPrimaryAdmin = user.role === "primary_admin"
  const stats = isPrimaryAdmin
    ? await getPrimaryAdminStats()
    : await getSecondaryAdminStats(user.id, user.companyId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.name}
        </p>
      </div>

      {isPrimaryAdmin ? (
        <>
          {/* Primary Admin Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCompanies || 0}</div>
                <p className="text-xs text-muted-foreground">Active companies</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeSubscriptions || 0}</div>
                <p className="text-xs text-muted-foreground">Current subscriptions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{stats.totalRevenue?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">Annual revenue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAdmins || 0}</div>
                <p className="text-xs text-muted-foreground">Admin accounts</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/dashboard/admin/companies">
                  <Button variant="outline" className="w-full justify-start">
                    <Building2 className="mr-2 h-4 w-4" />
                    Add New Company
                  </Button>
                </Link>
                <Link href="/dashboard/admin/admins">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Create Secondary Admin
                  </Button>
                </Link>
                <Link href="/dashboard/admin/announcements">
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Post Announcement
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
                <CardDescription>Latest system activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentActivities?.length > 0 ? (
                    stats.recentActivities.map((activity: any, index: number) => (
                      <div key={index} className="flex items-center justify-between border-b pb-2">
                        <div>
                          <p className="text-sm font-medium">{activity.title}</p>
                          <p className="text-xs text-muted-foreground">{activity.description}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent activities</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <>
          {/* Secondary Admin Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEmployees || 0}</div>
                <p className="text-xs text-muted-foreground">Active employees</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today&apos;s Present</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.todayAttendance || 0}</div>
                <p className="text-xs text-muted-foreground">Employees present</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today&apos;s Absent</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.todayAbsent || 0}</div>
                <p className="text-xs text-muted-foreground">Employees absent</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingLeaves || 0}</div>
                <p className="text-xs text-muted-foreground">Awaiting approval</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions and Pending Leaves */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/dashboard/admin/employees">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Add New Employee
                  </Button>
                </Link>
                <Link href="/dashboard/admin/hierarchy">
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Manage Hierarchy
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending Leave Requests</CardTitle>
                <CardDescription>Leaves awaiting your approval</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentLeaves?.length > 0 ? (
                    stats.recentLeaves.map((leave: any, index: number) => (
                      <div key={index} className="flex items-center justify-between border-b pb-2">
                        <div>
                          <p className="text-sm font-medium">{leave.title}</p>
                          <p className="text-xs text-muted-foreground">{leave.description}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{leave.time}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No pending leave requests</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
