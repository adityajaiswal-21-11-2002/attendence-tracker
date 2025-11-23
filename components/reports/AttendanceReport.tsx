"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface AttendanceReportProps {
  dateRange: { startDate: string; endDate: string }
  filters: { department: string; role: string }
}

export default function AttendanceReport({ dateRange, filters }: AttendanceReportProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReport()
  }, [dateRange, filters])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/reports/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...dateRange, ...filters }),
      })

      const result = await response.json()
      if (response.ok) {
        setData(result.report)
      }
    } catch (error) {
      console.error("Error fetching attendance report:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Attendance Summary</CardTitle>
          <CardDescription>
            Period: {data.period.startDate} to {data.period.endDate}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Employees</p>
              <p className="text-2xl font-bold">{data.summary.totalEmployees}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Present Days</p>
              <p className="text-2xl font-bold">{data.summary.totalPresentDays}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Absent Days</p>
              <p className="text-2xl font-bold">{data.summary.totalAbsentDays}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Avg Attendance %</p>
              <p className="text-2xl font-bold">{data.summary.averageAttendancePercentage}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employee-wise Attendance</CardTitle>
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
                {data.data.map((employee: any) => (
                  <TableRow key={employee.employeeId}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{employee.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{employee.employeeEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>{employee.presentDays}</TableCell>
                    <TableCell>{employee.absentDays}</TableCell>
                    <TableCell>{employee.halfDays}</TableCell>
                    <TableCell>{employee.leaveDays}</TableCell>
                    <TableCell>{employee.totalHours}</TableCell>
                    <TableCell>{employee.averageHours}</TableCell>
                    <TableCell>
                      <Badge variant={employee.lateArrivals > 0 ? "destructive" : "outline"}>
                        {employee.lateArrivals}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={employee.earlyDepartures > 0 ? "destructive" : "outline"}>
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
  )
}

