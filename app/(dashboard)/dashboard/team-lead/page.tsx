import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Users,
  Calendar,
  Clock,
  FileText,
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

async function getTeamLeadStats(userId: string, companyId: string) {
  try {
    await connectDB()

    // Get team members
    const teamMembers = await User.find({
      companyId,
      managerId: userId,
      isActive: true,
    }).select("_id name")

    const teamMemberIds = teamMembers.map((m) => m._id)

    // Today's attendance
    const today = new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)

    const todayAttendance = await Attendance.find({
      userId: { $in: teamMemberIds },
      date: { $gte: todayStart, $lte: todayEnd },
    })

    const presentToday = todayAttendance.filter((a) => a.status === "present").length
    const absentToday = todayAttendance.filter((a) => a.status === "absent").length

    // Upcoming rosters for team
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    const upcomingRosters = await Roster.countDocuments({
      userId: { $in: teamMemberIds },
      date: { $gte: today, $lte: nextWeek },
    })

    // Pending leave requests from team
    const Leave = (await import("@/models/Leave")).default
    const pendingLeaves = await Leave.countDocuments({
      userId: { $in: teamMemberIds },
      status: "pending",
    })

    // Active team members
    const activeTeamMembers = todayAttendance.filter(
      (a) => a.status === "present" && a.loginTime && !a.logoutTime
    ).length

    return {
      teamSize: teamMembers.length,
      presentToday,
      absentToday,
      activeTeamMembers,
      upcomingRosters,
      pendingLeaves,
      teamMembers: teamMembers.map((m) => ({ id: m._id, name: m.name })),
    }
  } catch (error) {
    console.error("Error fetching team lead stats:", error)
    return {
      teamSize: 0,
      presentToday: 0,
      absentToday: 0,
      activeTeamMembers: 0,
      upcomingRosters: 0,
      pendingLeaves: 0,
      teamMembers: [],
    }
  }
}

export default async function TeamLeadDashboard() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  if (
    user.role !== "team_lead" &&
    user.role !== "primary_admin" &&
    user.role !== "secondary_admin" &&
    user.role !== "operations_manager"
  ) {
    redirect("/dashboard")
  }

  const stats = await getTeamLeadStats(user.id, user.companyId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team Lead Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your team&apos;s roster, attendance, and tasks
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teamSize}</div>
            <p className="text-xs text-muted-foreground">Team members</p>
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
              {stats.activeTeamMembers} currently active
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
            <p className="text-xs text-muted-foreground">Team members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingLeaves}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Team Roster
            </CardTitle>
            <CardDescription>Manage your team&apos;s roster schedule</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/team-lead/roster">
              <Button className="w-full">
                Manage Roster
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Team Attendance
            </CardTitle>
            <CardDescription>View your team&apos;s attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/team-lead/attendance">
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
              <CheckCircle className="h-5 w-5" />
              Task Assignment
            </CardTitle>
            <CardDescription>Assign tasks to team members</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/team-lead/roster/tasks">
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
            <CardDescription>Approve leave requests from team</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.pendingLeaves > 0 ? (
              <Link href="/dashboard/team-lead/leaves">
                <Button variant="default" className="w-full">
                  Review Leaves ({stats.pendingLeaves})
                </Button>
              </Link>
            ) : (
              <Link href="/dashboard/team-lead/leaves">
                <Button variant="outline" className="w-full">
                  View Leaves
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Team Reports
            </CardTitle>
            <CardDescription>Generate team performance reports</CardDescription>
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
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>View your team members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.teamMembers.slice(0, 3).map((member) => (
                <div key={member.id.toString()} className="text-sm">
                  {member.name}
                </div>
              ))}
              {stats.teamMembers.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{stats.teamMembers.length - 3} more
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

