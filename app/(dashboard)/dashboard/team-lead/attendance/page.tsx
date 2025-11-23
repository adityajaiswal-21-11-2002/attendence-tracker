"use client"

import { useState, useEffect } from "react"
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
import { StatusCard } from "@/components/attendance/status-card"
import { Download, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"

interface EmployeeStatus {
  _id: string
  name: string
  email: string
  role: string
  status: "logged_in" | "on_break" | "logged_out"
  loginTime?: string
  currentShift?: string
  totalHours?: number
}

export default function TeamLeadAttendancePage() {
  const [employees, setEmployees] = useState<EmployeeStatus[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: "all",
    date: new Date().toISOString().split("T")[0],
  })

  useEffect(() => {
    fetchAttendance()
    const interval = setInterval(fetchAttendance, 10000)
    return () => clearInterval(interval)
  }, [filters.date])

  useEffect(() => {
    let filtered = [...employees]

    if (filters.status !== "all") {
      filtered = filtered.filter((emp) => emp.status === filters.status)
    }

    setFilteredEmployees(filtered)
  }, [employees, filters])

  const fetchAttendance = async () => {
    try {
      const response = await fetch(
        `/api/attendance/live-status?date=${filters.date}`
      )
      const data = await response.json()
      // Team lead only sees their team members
      setEmployees(data.employees || [])
    } catch (error) {
      console.error("Error fetching attendance:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/attendance/export?date=${filters.date}&format=csv`
      )
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `team-attendance-${filters.date}.csv`
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Attendance</h1>
          <p className="text-muted-foreground">
            Monitor your team&apos;s attendance in real-time
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
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <p className="text-muted-foreground">No team members found</p>
        ) : (
          filteredEmployees.map((employee) => (
            <StatusCard key={employee._id} employee={employee} />
          ))
        )}
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Attendance Log</CardTitle>
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
                      ? format(new Date(employee.loginTime), "HH:mm:ss")
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
    </div>
  )
}

