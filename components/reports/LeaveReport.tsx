"use client"

import { useState, useEffect, useCallback } from "react"
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
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { format } from "date-fns"

interface LeaveReportProps {
  dateRange: { startDate: string; endDate: string }
  filters: { department: string; role: string }
}

export default function LeaveReport({ dateRange, filters }: LeaveReportProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/reports/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...dateRange, ...filters }),
      })

      const result = await response.json()
      if (response.ok) {
        setData(result.report)
      }
    } catch (error) {
      console.error("Error fetching leave report:", error)
    } finally {
      setLoading(false)
    }
  }, [dateRange, filters])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case "earned":
        return "Earned"
      case "sick":
        return "Sick"
      case "comp_off":
        return "Comp Off"
      case "casual":
        return "Casual"
      default:
        return type
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center min-h-[300px]">
          <LoadingSpinner size="lg" text="Loading leave report..." />
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
          <CardTitle>Leave Summary</CardTitle>
          <CardDescription>
            Period: {data.period.startDate} to {data.period.endDate}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Leave Days</p>
              <p className="text-2xl font-bold">{data.summary.total}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-green-600">{data.summary.approved}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{data.summary.rejected}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{data.summary.pending}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Earned Leave</p>
              <p className="text-lg font-semibold">{data.summary.byType.earned}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Sick Leave</p>
              <p className="text-lg font-semibold">{data.summary.byType.sick}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Comp Off</p>
              <p className="text-lg font-semibold">{data.summary.byType.comp_off}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Casual Leave</p>
              <p className="text-lg font-semibold">{data.summary.byType.casual}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Department-wise Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Rejected</TableHead>
                  <TableHead>Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.departmentBreakdown.map((dept: any) => (
                  <TableRow key={dept.role}>
                    <TableCell className="font-medium">{dept.role}</TableCell>
                    <TableCell>{dept.employeeCount}</TableCell>
                    <TableCell>{dept.totalRequested}</TableCell>
                    <TableCell className="text-green-600">{dept.totalApproved}</TableCell>
                    <TableCell className="text-red-600">{dept.totalRejected}</TableCell>
                    <TableCell className="text-yellow-600">{dept.totalPending}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employee Leave Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Rejected</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Leave Balance</TableHead>
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
                    <TableCell>{employee.totalRequested}</TableCell>
                    <TableCell className="text-green-600">{employee.totalApproved}</TableCell>
                    <TableCell className="text-red-600">{employee.totalRejected}</TableCell>
                    <TableCell className="text-yellow-600">{employee.totalPending}</TableCell>
                    <TableCell>
                      {employee.leaveBalance ? (
                        <div className="text-xs">
                          <p>Earned: {employee.leaveBalance.earnedLeave}</p>
                          <p>Sick: {employee.leaveBalance.sickLeave}</p>
                          <p>Comp Off: {employee.leaveBalance.compOff}</p>
                          <p>Casual: {employee.leaveBalance.casualLeave}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
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

