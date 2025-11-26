"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { StatusCard } from "@/components/attendance/status-card"
import { Download, RefreshCw, FileText, Calendar, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"

interface EmployeeStatus {
  _id: string
  name: string
  email: string
  role: string
  status: "logged_in" | "on_break" | "logged_out"
  loginTime?: Date
  currentShift?: string
  totalHours?: number
}

interface AttendanceReportData {
  period: { startDate: string; endDate: string }
  summary: {
    totalEmployees: number
    totalPresentDays: number
    totalAbsentDays: number
    averageAttendancePercentage: number
  }
  data: Array<{
    employeeId: string
    employeeName: string
    employeeEmail: string
    presentDays: number
    absentDays: number
    halfDays: number
    leaveDays: number
    totalHours: number
    averageHours: number
    lateArrivals: number
    earlyDepartures: number
    attendancePercentage: string
  }>
}

export default function HRAttendancePage() {
  const [employees, setEmployees] = useState<EmployeeStatus[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    role: "all",
    status: "all",
    date: new Date().toISOString().split("T")[0],
  })
  
  // Report state
  const [reportData, setReportData] = useState<AttendanceReportData | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf" | null>(null)
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  })
  const [reportFilters, setReportFilters] = useState({
    department: "all",
    role: "all",
  })

  const fetchAttendance = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/attendance/live-status?date=${filters.date}`
      )
      const data = await response.json()
      const employees = (data.employees || []).map((emp: any) => ({
        ...emp,
        loginTime: emp.loginTime ? new Date(emp.loginTime) : undefined
      }))
      setEmployees(employees)
    } catch (error) {
      console.error("Error fetching attendance:", error)
    } finally {
      setLoading(false)
    }
  }, [filters.date])

  useEffect(() => {
    fetchAttendance()
    const interval = setInterval(fetchAttendance, 10000)
    return () => clearInterval(interval)
  }, [fetchAttendance])

  useEffect(() => {
    let filtered = [...employees]

    if (filters.role !== "all") {
      filtered = filtered.filter((emp) => emp.role === filters.role)
    }

    if (filters.status !== "all") {
      filtered = filtered.filter((emp) => emp.status === filters.status)
    }

    setFilteredEmployees(filtered)
  }, [employees, filters])

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/attendance/export?date=${filters.date}&format=csv`
      )
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `attendance-${filters.date}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error exporting attendance:", error)
    }
  }

  const getStatusCounts = () => {
    const loggedIn = employees.filter((e) => e.status === "logged_in").length
    const onBreak = employees.filter((e) => e.status === "on_break").length
    const loggedOut = employees.filter((e) => e.status === "logged_out").length
    return { loggedIn, onBreak, loggedOut, total: employees.length }
  }

  const counts = getStatusCounts()

  const handleGenerateReport = async () => {
    setReportLoading(true)
    try {
      const response = await fetch("/api/reports/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...dateRange, ...reportFilters }),
      })

      const result = await response.json()
      if (response.ok) {
        setReportData(result.report)
      } else {
        alert(result.error || "Failed to generate report")
      }
    } catch (error) {
      console.error("Error generating report:", error)
      alert("Failed to generate report")
    } finally {
      setReportLoading(false)
    }
  }

  const handleExportReport = async (format: "excel" | "pdf") => {
    if (exportLoading) return
    
    setExportLoading(true)
    setExportFormat(format)
    try {
      const response = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: "attendance",
          dateRange,
          filters: reportFilters,
          format,
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `attendance-report-${dateRange.startDate}-to-${dateRange.endDate}.${format === "excel" ? "xlsx" : "pdf"}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert("Failed to export report")
      }
    } catch (error) {
      console.error("Error exporting report:", error)
      alert("Failed to export report")
    } finally {
      setExportLoading(false)
      setExportFormat(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Attendance Management</h1>
        <p className="text-muted-foreground">
          Monitor live attendance and generate comprehensive reports
        </p>
      </div>

      <Tabs defaultValue="live" className="space-y-4">
        <TabsList>
          <TabsTrigger value="live">
            <Calendar className="mr-2 h-4 w-4" />
            Live Attendance
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="mr-2 h-4 w-4" />
            Attendance Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Live Attendance Tracker</h2>
              <p className="text-muted-foreground">
                Monitor employee attendance in real-time
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchAttendance}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Logged In</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{counts.loggedIn}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">On Break</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{counts.onBreak}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Logged Out</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{counts.loggedOut}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={filters.date}
                onChange={(e) =>
                  setFilters({ ...filters, date: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                id="role"
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              >
                <option value="all">All Roles</option>
                <option value="hr_manager">HR Manager</option>
                <option value="operations_manager">Operations Manager</option>
                <option value="team_lead">Team Lead</option>
                <option value="employee">Employee</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
              >
                <option value="all">All Status</option>
                <option value="logged_in">Logged In</option>
                <option value="on_break">On Break</option>
                <option value="logged_out">Logged Out</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Status Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <LoadingSpinner size="lg" text="Loading attendance data..." />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <p className="text-muted-foreground">No employees found</p>
        ) : (
          filteredEmployees.map((employee) => (
            <StatusCard key={employee._id} employee={employee} />
          ))
        )}
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Attendance Log</CardTitle>
          <CardDescription>
            Complete attendance records for {format(new Date(filters.date), "MMMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Login Time</TableHead>
                <TableHead>Total Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee._id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.role.replace("_", " ")}</TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        employee.status === "logged_in"
                          ? "bg-green-100 text-green-800"
                          : employee.status === "on_break"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {employee.status.replace("_", " ")}
                    </span>
                  </TableCell>
                  <TableCell>
                    {employee.loginTime
                      ? format(employee.loginTime, "HH:mm:ss")
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    {employee.totalHours
                      ? `${employee.totalHours.toFixed(2)} hrs`
                      : "N/A"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Attendance Report</CardTitle>
              <CardDescription>
                Select date range and filters to generate a comprehensive attendance report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) =>
                        setDateRange({ ...dateRange, startDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) =>
                        setDateRange({ ...dateRange, endDate: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reportDepartment">Department</Label>
                    <Select
                      id="reportDepartment"
                      value={reportFilters.department}
                      onChange={(e) =>
                        setReportFilters({ ...reportFilters, department: e.target.value })
                      }
                    >
                      <option value="all">All Departments</option>
                      <option value="hr">HR</option>
                      <option value="operations">Operations</option>
                      <option value="sales">Sales</option>
                      <option value="it">IT</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reportRole">Role</Label>
                    <Select
                      id="reportRole"
                      value={reportFilters.role}
                      onChange={(e) =>
                        setReportFilters({ ...reportFilters, role: e.target.value })
                      }
                    >
                      <option value="all">All Roles</option>
                      <option value="hr_manager">HR Manager</option>
                      <option value="operations_manager">Operations Manager</option>
                      <option value="team_lead">Team Lead</option>
                      <option value="employee">Employee</option>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleGenerateReport} disabled={reportLoading}>
                    {reportLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Generate Report
                      </>
                    )}
                  </Button>
                  {reportData && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleExportReport("excel")}
                        disabled={exportLoading || reportLoading}
                      >
                        {exportLoading && exportFormat === "excel" ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Exporting...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Export Excel
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleExportReport("pdf")}
                        disabled={exportLoading || reportLoading}
                      >
                        {exportLoading && exportFormat === "pdf" ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Exporting...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Export PDF
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {reportLoading && (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </CardContent>
            </Card>
          )}

          {reportData && !reportLoading && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Summary</CardTitle>
                  <CardDescription>
                    Period: {format(new Date(reportData.period.startDate), "MMM dd, yyyy")} to{" "}
                    {format(new Date(reportData.period.endDate), "MMM dd, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Employees</p>
                      <p className="text-2xl font-bold">{reportData.summary.totalEmployees}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Present Days</p>
                      <p className="text-2xl font-bold">{reportData.summary.totalPresentDays}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Absent Days</p>
                      <p className="text-2xl font-bold">{reportData.summary.totalAbsentDays}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Avg Attendance %</p>
                      <p className="text-2xl font-bold">
                        {typeof reportData.summary.averageAttendancePercentage === "number"
                          ? reportData.summary.averageAttendancePercentage.toFixed(1)
                          : parseFloat(reportData.summary.averageAttendancePercentage || "0").toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Employee-wise Attendance</CardTitle>
                  <CardDescription>
                    Detailed attendance breakdown for all employees
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Present</TableHead>
                          <TableHead>Absent</TableHead>
                          <TableHead>Half Days</TableHead>
                          <TableHead>Leave Days</TableHead>
                          <TableHead>Total Hours</TableHead>
                          <TableHead>Avg Hours</TableHead>
                          <TableHead>Late Arrivals</TableHead>
                          <TableHead>Early Departures</TableHead>
                          <TableHead>Attendance %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.data.map((employee) => (
                          <TableRow key={employee.employeeId}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{employee.employeeName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {employee.employeeEmail}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{employee.presentDays}</TableCell>
                            <TableCell>{employee.absentDays}</TableCell>
                            <TableCell>{employee.halfDays}</TableCell>
                            <TableCell>{employee.leaveDays}</TableCell>
                            <TableCell>
                              {typeof employee.totalHours === "number"
                                ? employee.totalHours.toFixed(1)
                                : parseFloat(employee.totalHours || "0").toFixed(1)}
                            </TableCell>
                            <TableCell>
                              {typeof employee.averageHours === "number"
                                ? employee.averageHours.toFixed(1)
                                : parseFloat(employee.averageHours || "0").toFixed(1)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={employee.lateArrivals > 0 ? "destructive" : "outline"}
                              >
                                {employee.lateArrivals}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  employee.earlyDepartures > 0 ? "destructive" : "outline"
                                }
                              >
                                {employee.earlyDepartures}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  parseFloat(employee.attendancePercentage) >= 90
                                    ? "default"
                                    : parseFloat(employee.attendancePercentage) >= 75
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {employee.attendancePercentage}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

