"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
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
import { Select } from "@/components/ui/select"
import { Download, Calendar, DollarSign } from "lucide-react"
import { format } from "date-fns"

interface SalaryConfig {
  salaryType: string
  baseAmount: number
  currency: string
  overtimeEnabled: boolean
}

interface Payslip {
  _id: string
  month: number
  year: number
  grossPay: number
  totalDeductions: number
  netPay: number
  status: string
  generatedAt: string
  attendanceSummary?: {
    totalDays: number
    presentDays: number
    absentDays: number
    halfDays: number
    leaveDays: number
    totalHours: number
    overtimeHours: number
  }
}

interface CurrentPayslip extends Payslip {
  attendanceSummary: {
    totalDays: number
    presentDays: number
    absentDays: number
    halfDays: number
    leaveDays: number
    totalHours: number
    overtimeHours: number
  }
}

export default function EmployeeSalaryPage() {
  const [config, setConfig] = useState<SalaryConfig | null>(null)
  const [currentPayslip, setCurrentPayslip] = useState<CurrentPayslip | null>(null)
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch("/api/salary/employee-view")
      const data = await response.json()

      setConfig(data.configuration)
      setCurrentPayslip(data.currentPayslip)
      setPayslips(data.payslips || [])
    } catch (error) {
      console.error("Error fetching salary data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPayslip = (month: number, year: number) => {
    const url = `/api/salary/download/employee/${month}?year=${year}`
    window.open(url, "_blank")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "generated":
        return <Badge variant="default">Generated</Badge>
      case "sent":
        return <Badge className="bg-blue-500">Sent</Badge>
      case "paid":
        return <Badge className="bg-green-500">Paid</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Salary</h1>
        <p className="text-muted-foreground">
          View your salary details and download payslips
        </p>
      </div>

      {/* Current Month Payslip */}
      {currentPayslip && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  Payslip - {format(new Date(currentPayslip.year, currentPayslip.month - 1, 1), "MMMM yyyy")}
                </CardTitle>
                <CardDescription>Current month salary breakdown</CardDescription>
              </div>
              <Button
                onClick={() => handleDownloadPayslip(currentPayslip.month, currentPayslip.year)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Attendance Summary */}
              {currentPayslip.attendanceSummary && (
                <div>
                  <h3 className="font-semibold mb-4">Attendance Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Days</p>
                      <p className="text-lg font-semibold">
                        {currentPayslip.attendanceSummary.totalDays}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Present Days</p>
                      <p className="text-lg font-semibold">
                        {currentPayslip.attendanceSummary.presentDays}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Absent Days</p>
                      <p className="text-lg font-semibold">
                        {currentPayslip.attendanceSummary.absentDays}
                      </p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Hours</p>
                      <p className="text-lg font-semibold">
                        {currentPayslip.attendanceSummary.totalHours.toFixed(2)}
                      </p>
                    </div>
                    {currentPayslip.attendanceSummary.overtimeHours > 0 && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Overtime Hours</p>
                        <p className="text-lg font-semibold">
                          {currentPayslip.attendanceSummary.overtimeHours.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Salary Breakdown */}
              <div>
                <h3 className="font-semibold mb-4">Salary Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <span className="text-muted-foreground">Gross Pay</span>
                    <span className="font-semibold">₹{currentPayslip.grossPay.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <span className="text-muted-foreground">Total Deductions</span>
                    <span className="font-semibold text-red-600">
                      -₹{currentPayslip.totalDeductions.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 border-2 border-primary rounded-lg bg-primary/5">
                    <span className="text-lg font-semibold">Net Pay</span>
                    <span className="text-2xl font-bold text-primary">
                      ₹{currentPayslip.netPay.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge>{getStatusBadge(currentPayslip.status)}</Badge>
                <span className="text-sm text-muted-foreground">
                  Generated on {format(new Date(currentPayslip.generatedAt), "MMM dd, yyyy")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Salary Configuration */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle>Salary Configuration</CardTitle>
            <CardDescription>Your current salary settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Salary Type</p>
                <p className="font-semibold capitalize">{config.salaryType}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Base Amount</p>
                <p className="font-semibold">
                  {config.currency} {config.baseAmount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overtime</p>
                <p className="font-semibold">
                  {config.overtimeEnabled ? "Enabled" : "Disabled"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Salary History */}
      <Card>
        <CardHeader>
          <CardTitle>Salary History</CardTitle>
          <CardDescription>View your past payslips</CardDescription>
        </CardHeader>
        <CardContent>
          {payslips.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No payslips found
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Gross Pay</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payslips.map((payslip) => (
                    <TableRow key={payslip._id}>
                      <TableCell>
                        {format(new Date(payslip.year, payslip.month - 1, 1), "MMM yyyy")}
                      </TableCell>
                      <TableCell>₹{payslip.grossPay.toLocaleString()}</TableCell>
                      <TableCell>₹{payslip.totalDeductions.toLocaleString()}</TableCell>
                      <TableCell className="font-semibold">
                        ₹{payslip.netPay.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(payslip.status)}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPayslip(payslip.month, payslip.year)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

