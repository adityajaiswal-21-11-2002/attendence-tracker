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
import { Loader2 } from "lucide-react"

interface SalaryReportProps {
  dateRange: { startDate: string; endDate: string }
  filters: { department: string; role: string }
}

export default function SalaryReport({ dateRange, filters }: SalaryReportProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReport()
  }, [dateRange, filters])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/reports/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...dateRange, ...filters }),
      })

      const result = await response.json()
      if (response.ok) {
        setData(result.report)
      }
    } catch (error) {
      console.error("Error fetching salary report:", error)
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
          <CardTitle>Salary Summary</CardTitle>
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
              <p className="text-sm text-muted-foreground">Total Gross Pay</p>
              <p className="text-2xl font-bold">₹{data.summary.totalGrossPay.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Deductions</p>
              <p className="text-2xl font-bold">₹{data.summary.totalDeductions.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Net Pay</p>
              <p className="text-2xl font-bold text-primary">
                ₹{data.summary.totalNetPay.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Overtime Pay</p>
              <p className="text-2xl font-bold">₹{data.summary.totalOvertimePay.toLocaleString()}</p>
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
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Overtime Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.departmentBreakdown.map((dept: any) => (
                  <TableRow key={dept.role}>
                    <TableCell className="font-medium">{dept.role}</TableCell>
                    <TableCell>{dept.employeeCount}</TableCell>
                    <TableCell>₹{dept.totalGrossPay.toLocaleString()}</TableCell>
                    <TableCell>₹{dept.totalDeductions.toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">
                      ₹{dept.totalNetPay.toLocaleString()}
                    </TableCell>
                    <TableCell>₹{dept.totalOvertimePay.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employee-wise Salary Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Payslips</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Overtime Pay</TableHead>
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
                    <TableCell>{employee.payslips.length}</TableCell>
                    <TableCell>₹{employee.totalGrossPay.toLocaleString()}</TableCell>
                    <TableCell>₹{employee.totalDeductions.toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">
                      ₹{employee.totalNetPay.toLocaleString()}
                    </TableCell>
                    <TableCell>₹{employee.totalOvertimePay.toLocaleString()}</TableCell>
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

