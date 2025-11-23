"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, CalendarDays, Clock, FileText } from "lucide-react"
import { format } from "date-fns"

interface LeaveBalance {
  earnedLeave: { total: number; used: number; available: number }
  sickLeave: { total: number; used: number; available: number }
  compOff: { total: number; used: number; available: number }
  casualLeave: { total: number; used: number; available: number }
}

interface Leave {
  _id: string
  leaveType: "earned" | "sick" | "comp_off" | "casual"
  fromDate: string
  toDate: string
  numberOfDays: number
  reason: string
  status: "pending" | "approved" | "rejected"
  approvedBy?: { name: string; email: string } | null
  comments?: string
  createdAt: string
}

interface Holiday {
  _id: string
  name: string
  date: string
  isNational: boolean
}

export default function EmployeeLeavesPage() {
  const [balance, setBalance] = useState<LeaveBalance | null>(null)
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    leaveType: "earned",
    fromDate: "",
    toDate: "",
    reason: "",
  })
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const fetchData = useCallback(async () => {
    try {
      const [balanceRes, historyRes, holidaysRes] = await Promise.all([
        fetch("/api/leaves/balance"),
        fetch(`/api/leaves/history?year=${selectedYear}`),
        fetch(`/api/leaves/holidays?year=${selectedYear}`),
      ])

      const balanceData = await balanceRes.json()
      const historyData = await historyRes.json()
      const holidaysData = await holidaysRes.json()

      setBalance(balanceData.balance)
      setLeaves(historyData.leaves || [])
      setHolidays(holidaysData.holidays || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }, [selectedYear])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch("/api/leaves/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        alert("Leave request submitted successfully!")
        setFormData({
          leaveType: "earned",
          fromDate: "",
          toDate: "",
          reason: "",
        })
        fetchData()
      } else {
        alert(data.error || "Failed to submit leave request")
      }
    } catch (error) {
      console.error("Error submitting leave:", error)
      alert("Failed to submit leave request")
    } finally {
      setSubmitting(false)
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

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case "earned":
        return "Earned Leave"
      case "sick":
        return "Sick Leave"
      case "comp_off":
        return "Comp Off"
      case "casual":
        return "Casual Leave"
      default:
        return type
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
        <h1 className="text-3xl font-bold">Leave Management</h1>
        <p className="text-muted-foreground">Apply for leaves and track your leave balance</p>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Earned Leave</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {balance?.earnedLeave.available ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {balance?.earnedLeave.used ?? 0} used of {balance?.earnedLeave.total ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sick Leave</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {balance?.sickLeave.available ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {balance?.sickLeave.used ?? 0} used of {balance?.sickLeave.total ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Comp Off</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {balance?.compOff.available ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {balance?.compOff.used ?? 0} used of {balance?.compOff.total ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Casual Leave</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {balance?.casualLeave.available ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {balance?.casualLeave.used ?? 0} used of {balance?.casualLeave.total ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="apply" className="space-y-4">
        <TabsList>
          <TabsTrigger value="apply">Apply Leave</TabsTrigger>
          <TabsTrigger value="history">Leave History</TabsTrigger>
          <TabsTrigger value="calendar">Holiday Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="apply" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Apply for Leave</CardTitle>
              <CardDescription>
                Submit a leave request. Weekends and holidays are automatically excluded.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="leaveType">Leave Type</Label>
                    <Select
                      id="leaveType"
                      value={formData.leaveType}
                      onChange={(e) =>
                        setFormData({ ...formData, leaveType: e.target.value })
                      }
                    >
                      <option value="earned">Earned Leave</option>
                      <option value="sick">Sick Leave</option>
                      <option value="comp_off">Comp Off</option>
                      <option value="casual">Casual Leave</option>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fromDate">From Date</Label>
                    <Input
                      id="fromDate"
                      type="date"
                      value={formData.fromDate}
                      onChange={(e) =>
                        setFormData({ ...formData, fromDate: e.target.value })
                      }
                      required
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="toDate">To Date</Label>
                    <Input
                      id="toDate"
                      type="date"
                      value={formData.toDate}
                      onChange={(e) =>
                        setFormData({ ...formData, toDate: e.target.value })
                      }
                      required
                      min={formData.fromDate || new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                    placeholder="Please provide a reason for your leave request"
                    required
                    rows={4}
                  />
                </div>

                <Button type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Leave Request"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Leave History</CardTitle>
                  <CardDescription>
                    View your leave requests for {selectedYear}
                  </CardDescription>
                </div>
                <Select
                  value={selectedYear.toString()}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  <option value={(selectedYear - 1).toString()}>{selectedYear - 1}</option>
                  <option value={selectedYear.toString()}>{selectedYear}</option>
                  <option value={(selectedYear + 1).toString()}>{selectedYear + 1}</option>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {leaves.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No leave requests found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>From Date</TableHead>
                      <TableHead>To Date</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approved By</TableHead>
                      <TableHead>Comments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaves.map((leave) => (
                      <TableRow key={leave._id}>
                        <TableCell>{getLeaveTypeLabel(leave.leaveType)}</TableCell>
                        <TableCell>
                          {format(new Date(leave.fromDate), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          {format(new Date(leave.toDate), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>{leave.numberOfDays}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {leave.reason}
                        </TableCell>
                        <TableCell>{getStatusBadge(leave.status)}</TableCell>
                        <TableCell>
                          {leave.approvedBy?.name || "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {leave.comments || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Holiday Calendar</CardTitle>
                  <CardDescription>
                    National and regional holidays for {selectedYear}
                  </CardDescription>
                </div>
                <Select
                  value={selectedYear.toString()}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  <option value={(selectedYear - 1).toString()}>{selectedYear - 1}</option>
                  <option value={selectedYear.toString()}>{selectedYear}</option>
                  <option value={(selectedYear + 1).toString()}>{selectedYear + 1}</option>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {holidays.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No holidays found
                </p>
              ) : (
                <div className="space-y-6">
                  {/* Calendar Grid View */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                      const monthHolidays = holidays.filter(
                        (h) => new Date(h.date).getMonth() + 1 === month
                      )
                      return (
                        <div
                          key={month}
                          className="border rounded-lg p-4 space-y-2"
                        >
                          <h3 className="font-semibold text-lg">
                            {format(new Date(selectedYear, month - 1, 1), "MMMM")}
                          </h3>
                          {monthHolidays.length > 0 ? (
                            <div className="space-y-1">
                              {monthHolidays.map((holiday) => (
                                <div
                                  key={holiday._id}
                                  className="flex items-center gap-2 p-2 bg-muted rounded text-sm"
                                >
                                  <CalendarDays className="h-4 w-4 text-primary" />
                                  <div className="flex-1">
                                    <p className="font-medium">{holiday.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(holiday.date), "EEEE, dd")}
                                    </p>
                                  </div>
                                  {holiday.isNational && (
                                    <Badge variant="outline" className="text-xs">
                                      National
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No holidays</p>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* List View */}
                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4">All Holidays ({holidays.length})</h3>
                    <div className="space-y-2">
                      {holidays.map((holiday) => (
                        <div
                          key={holiday._id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <CalendarDays className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{holiday.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(holiday.date), "EEEE, MMMM dd, yyyy")}
                              </p>
                            </div>
                          </div>
                          {holiday.isNational && (
                            <Badge variant="outline">National</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}


