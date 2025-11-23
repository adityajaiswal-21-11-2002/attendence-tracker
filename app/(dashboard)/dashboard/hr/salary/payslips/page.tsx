"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Download, Mail, FileText, Calendar } from "lucide-react"
import { format } from "date-fns"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"

interface Payslip {
  _id: string
  userId: { _id: string; name: string; email: string }
  month: number
  year: number
  grossPay: number
  totalDeductions: number
  netPay: number
  status: "draft" | "generated" | "sent" | "paid"
  generatedAt: string
  sentAt?: string
}

interface Employee {
  _id: string
  name: string
  email: string
}

export default function HRPayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null)

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const fetchData = useCallback(async () => {
    try {
      const [payslipsRes, employeesRes] = await Promise.all([
        fetch(`/api/salary/payslips?month=${selectedMonth}&year=${selectedYear}`),
        fetch("/api/admin/employees"),
      ])

      const payslipsData = await payslipsRes.json()
      const employeesData = await employeesRes.json()

      setPayslips(payslipsData.payslips || [])
      setEmployees(
        employeesData.employees?.filter((e: Employee) => e.role === "employee") || []
      )
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, selectedYear])

  const handleGeneratePayslips = async () => {
    if (!confirm(`Generate payslips for all employees for ${format(new Date(selectedYear, selectedMonth - 1, 1), "MMMM yyyy")}?`)) {
      return
    }

    setGenerating(true)
    try {
      const response = await fetch("/api/salary/generate-payslips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message)
        if (data.errors && data.errors.length > 0) {
          console.error("Errors:", data.errors)
        }
        fetchData()
      } else {
        alert(data.error || "Failed to generate payslips")
      }
    } catch (error) {
      console.error("Error generating payslips:", error)
      alert("Failed to generate payslips")
    } finally {
      setGenerating(false)
    }
  }

  const handleSendEmails = async (payslipIds?: string[]) => {
    if (!confirm("Send payslips via email to selected employees?")) {
      return
    }

    setSending(true)
    try {
      const response = await fetch("/api/salary/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payslipIds: payslipIds || payslips.map((p) => p._id),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message)
        if (data.errors && data.errors.length > 0) {
          console.error("Errors:", data.errors)
        }
        fetchData()
      } else {
        alert(data.error || "Failed to send emails")
      }
    } catch (error) {
      console.error("Error sending emails:", error)
      alert("Failed to send emails")
    } finally {
      setSending(false)
    }
  }

  const handleDownloadPayslip = (payslip: Payslip) => {
    const url = `/api/salary/download/${payslip.userId._id}/${payslip.month}?year=${payslip.year}`
    window.open(url, "_blank")
  }

  const handlePreview = (payslip: Payslip) => {
    setSelectedPayslip(payslip)
    setPreviewDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "generated":
        return <Badge variant="default">Generated</Badge>
      case "sent":
        return <Badge className="bg-blue-500">Sent</Badge>
      case "paid":
        return <Badge className="bg-green-500">Paid</Badge>
      case "draft":
        return <Badge variant="secondary">Draft</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Loading payslips..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payslip Management</h1>
          <p className="text-muted-foreground">
            Generate and manage employee payslips
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGeneratePayslips} disabled={generating}>
            <FileText className="mr-2 h-4 w-4" />
            {generating ? "Generating..." : "Generate Payslips"}
          </Button>
          {payslips.length > 0 && (
            <Button onClick={() => handleSendEmails()} disabled={sending}>
              <Mail className="mr-2 h-4 w-4" />
              {sending ? "Sending..." : "Send All via Email"}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payslips</CardTitle>
              <CardDescription>
                View and manage payslips for employees
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select
                value={selectedMonth.toString()}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m.toString()}>
                    {format(new Date(2024, m - 1, 1), "MMMM")}
                  </option>
                ))}
              </Select>
              <Select
                value={selectedYear.toString()}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                <option value={(selectedYear - 1).toString()}>{selectedYear - 1}</option>
                <option value={selectedYear.toString()}>{selectedYear}</option>
                <option value={(selectedYear + 1).toString()}>{selectedYear + 1}</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {payslips.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No payslips found for {format(new Date(selectedYear, selectedMonth - 1, 1), "MMMM yyyy")}
              </p>
              <Button onClick={handleGeneratePayslips} disabled={generating}>
                Generate Payslips
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Gross Pay</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payslips.map((payslip) => (
                    <TableRow key={payslip._id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payslip.userId.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {payslip.userId.email}
                          </p>
                        </div>
                      </TableCell>
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
                        {format(new Date(payslip.generatedAt), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadPayslip(payslip)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {payslip.status !== "sent" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendEmails([payslip._id])}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payslip Preview</DialogTitle>
            <DialogDescription>
              {selectedPayslip && `${selectedPayslip.userId.name} - ${format(new Date(selectedPayslip.year, selectedPayslip.month - 1, 1), "MMMM yyyy")}`}
            </DialogDescription>
          </DialogHeader>
          {selectedPayslip && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Gross Pay</Label>
                  <p className="text-lg font-semibold">₹{selectedPayslip.grossPay.toLocaleString()}</p>
                </div>
                <div>
                  <Label>Total Deductions</Label>
                  <p className="text-lg font-semibold">₹{selectedPayslip.totalDeductions.toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <Label>Net Pay</Label>
                  <p className="text-2xl font-bold text-primary">₹{selectedPayslip.netPay.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleDownloadPayslip(selectedPayslip)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
                {selectedPayslip.status !== "sent" && (
                  <Button onClick={() => handleSendEmails([selectedPayslip._id])}>
                    <Mail className="mr-2 h-4 w-4" />
                    Send via Email
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

