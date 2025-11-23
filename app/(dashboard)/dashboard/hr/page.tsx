import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Users,
  DollarSign,
  Network,
  TrendingUp,
  Calendar,
  FileText,
  Settings,
  ArrowRight,
  Clock,
} from "lucide-react"
import Link from "next/link"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Payslip from "@/models/Payslip"
import LeaveBalance from "@/models/LeaveBalance"

async function getHRStats(userId: string, companyId: string) {
  try {
    await connectDB()

    const totalEmployees = await User.countDocuments({
      companyId,
      role: "employee",
      isActive: true,
    })

    // Calculate salary budget (sum of all active employee base salaries)
    const employees = await User.find({
      companyId,
      role: "employee",
      isActive: true,
    }).select("salary")

    const salaryBudget = employees.reduce((sum, emp) => {
      return sum + (emp.salary?.amount || 0)
    }, 0)

    // Get current month payslips for total disbursed
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()
    const currentPayslips = await Payslip.find({
      companyId,
      month: currentMonth,
      year: currentYear,
      status: { $in: ["generated", "sent", "paid"] },
    })

    const totalDisbursed = currentPayslips.reduce((sum, p) => sum + p.netPay, 0)

    // Pending leave requests
    const Leave = (await import("@/models/Leave")).default
    const pendingLeaves = await Leave.countDocuments({
      companyId,
      status: "pending",
    })

    // Employees without leave balance
    const employeesWithBalance = await LeaveBalance.distinct("userId", {
      companyId,
      year: currentYear,
    })
    const employeesWithoutBalance = totalEmployees - employeesWithBalance.length

    return {
      totalEmployees,
      salaryBudget,
      totalDisbursed,
      pendingLeaves,
      employeesWithoutBalance,
    }
  } catch (error) {
    console.error("Error fetching HR stats:", error)
    return {
      totalEmployees: 0,
      salaryBudget: 0,
      totalDisbursed: 0,
      pendingLeaves: 0,
      employeesWithoutBalance: 0,
    }
  }
}

export default async function HRDashboard() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  if (user.role !== "hr_manager" && user.role !== "primary_admin" && user.role !== "secondary_admin") {
    redirect("/dashboard")
  }

  const stats = await getHRStats(user.id, user.companyId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">HR Manager Dashboard</h1>
        <p className="text-muted-foreground">
          Manage employees, salaries, and organizational structure
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
            <CardTitle className="text-sm font-medium">Salary Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.salaryBudget.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Monthly budget</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalDisbursed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This month</p>
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
              <Users className="h-5 w-5" />
              Employee Management
            </CardTitle>
            <CardDescription>Manage employees and their details</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/admin/employees">
              <Button className="w-full">
                Manage Employees
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Salary Management
            </CardTitle>
            <CardDescription>Configure salaries and generate payslips</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/dashboard/hr/salary/configure" className="block">
                <Button variant="outline" className="w-full">
                  Configure Salaries
                </Button>
              </Link>
              <Link href="/dashboard/hr/salary/payslips" className="block">
                <Button variant="outline" className="w-full">
                  Generate Payslips
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Hierarchy Management
            </CardTitle>
            <CardDescription>Manage organizational structure</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/admin/hierarchy">
              <Button className="w-full">
                Manage Hierarchy
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Attendance Reports
            </CardTitle>
            <CardDescription>View and track employee attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/dashboard/hr/attendance" className="block">
                <Button variant="outline" className="w-full">
                  Live Attendance
                </Button>
              </Link>
              <Link href="/dashboard/reports" className="block">
                <Button variant="outline" className="w-full">
                  Attendance Reports
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Leave Management
            </CardTitle>
            <CardDescription>Configure and manage leave balances</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/hr/leaves">
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
              <FileText className="h-5 w-5" />
              Reports & Analytics
            </CardTitle>
            <CardDescription>Generate comprehensive reports</CardDescription>
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
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common HR tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.employeesWithoutBalance > 0 && (
                <Link href="/dashboard/hr/leaves">
                  <Button variant="outline" className="w-full">
                    Setup Leave Balances ({stats.employeesWithoutBalance})
                  </Button>
                </Link>
              )}
              {stats.pendingLeaves > 0 && (
                <Link href="/dashboard/hr/leaves">
                  <Button variant="outline" className="w-full">
                    Review Leaves ({stats.pendingLeaves})
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

