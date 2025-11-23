"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select } from "@/components/ui/select"
import { CheckCircle, XCircle, Calendar, Download } from "lucide-react"
import { format } from "date-fns"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"

interface Leave {
  _id: string
  userId: { _id: string; name: string; email: string }
  leaveType: "earned" | "sick" | "comp_off" | "casual"
  fromDate: string
  toDate: string
  numberOfDays: number
  reason: string
  status: "pending" | "approved" | "rejected"
  createdAt: string
}

export default function OperationsLeavesPage() {
  const [pendingLeaves, setPendingLeaves] = useState<Leave[]>([])
  const [allLeaves, setAllLeaves] = useState<Leave[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [action, setAction] = useState<"approve" | "reject" | null>(null)
  const [comments, setComments] = useState("")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    fetchLeaves()
  }, [selectedYear])

  const fetchLeaves = async () => {
    try {
      const [pendingRes, teamRes] = await Promise.all([
        fetch("/api/leaves/pending"),
        fetch(`/api/leaves/team?year=${selectedYear}`),
      ])

      const pendingData = await pendingRes.json()
      const teamData = await teamRes.json()

      setPendingLeaves(pendingData.leaves || [])
      setAllLeaves(teamData.leaves || [])
    } catch (error) {
      console.error("Error fetching leaves:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = (leave: Leave) => {
    setSelectedLeave(leave)
    setAction("approve")
    setComments("")
    setDialogOpen(true)
  }

  const handleReject = (leave: Leave) => {
    setSelectedLeave(leave)
    setAction("reject")
    setComments("")
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!selectedLeave) return

    if (action === "reject" && !comments.trim()) {
      alert("Comments are required for rejection")
      return
    }

    try {
      const endpoint = action === "approve" ? "/api/leaves/approve" : "/api/leaves/reject"
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveId: selectedLeave._id,
          comments: comments || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message)
        setDialogOpen(false)
        fetchLeaves()
      } else {
        alert(data.error || "Failed to process leave request")
      }
    } catch (error) {
      console.error("Error processing leave:", error)
      alert("Failed to process leave request")
    }
  }

  const handleDownloadReport = async () => {
    try {
      const response = await fetch(`/api/leaves/report?year=${selectedYear}&format=excel`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `leave-report-${selectedYear}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Error downloading report:", error)
      alert("Failed to download report")
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
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Loading leave data..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground">Approve or reject leave requests</p>
        </div>
        <Button onClick={handleDownloadReport}>
          <Download className="mr-2 h-4 w-4" />
          Download Report
        </Button>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Requests ({pendingLeaves.length})
          </TabsTrigger>
          <TabsTrigger value="calendar">Leave Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Leave Requests</CardTitle>
              <CardDescription>
                Review and approve or reject leave requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingLeaves.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No pending leave requests
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>From Date</TableHead>
                      <TableHead>To Date</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingLeaves.map((leave) => (
                      <TableRow key={leave._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{leave.userId.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {leave.userId.email}
                            </p>
                          </div>
                        </TableCell>
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
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(leave)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(leave)}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </div>
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
                  <CardTitle>Leave Calendar</CardTitle>
                  <CardDescription>
                    View all leaves for {selectedYear}
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
              {allLeaves.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No leaves found
                </p>
              ) : (
                <div className="space-y-6">
                  {/* Group leaves by month */}
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const monthLeaves = allLeaves.filter(
                      (l) => new Date(l.fromDate).getMonth() + 1 === month
                    )
                    if (monthLeaves.length === 0) return null

                    return (
                      <div key={month} className="space-y-3">
                        <h3 className="font-semibold text-lg border-b pb-2">
                          {format(new Date(selectedYear, month - 1, 1), "MMMM yyyy")}
                        </h3>
                        <div className="space-y-2">
                          {monthLeaves.map((leave) => (
                            <div
                              key={leave._id}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <Calendar className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{leave.userId.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {getLeaveTypeLabel(leave.leaveType)} • {leave.numberOfDays} day(s)
                                  </p>
                                  {leave.reason && (
                                    <p className="text-xs text-muted-foreground mt-1 max-w-md truncate">
                                      {leave.reason}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium">
                                  {format(new Date(leave.fromDate), "MMM dd")} -{" "}
                                  {format(new Date(leave.toDate), "MMM dd, yyyy")}
                                </p>
                                <Badge
                                  variant={
                                    leave.status === "approved"
                                      ? "default"
                                      : leave.status === "rejected"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                  className="mt-1"
                                >
                                  {leave.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "approve" ? "Approve Leave Request" : "Reject Leave Request"}
            </DialogTitle>
            <DialogDescription>
              {selectedLeave && (
                <>
                  {selectedLeave.userId.name} - {getLeaveTypeLabel(selectedLeave.leaveType)}
                  <br />
                  {format(new Date(selectedLeave.fromDate), "MMM dd, yyyy")} to{" "}
                  {format(new Date(selectedLeave.toDate), "MMM dd, yyyy")} ({selectedLeave.numberOfDays} days)
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comments">
                Comments {action === "reject" && "(Required)"}
              </Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={
                  action === "approve"
                    ? "Add optional comments..."
                    : "Please provide a reason for rejection..."
                }
                rows={4}
                required={action === "reject"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant={action === "reject" ? "destructive" : "default"}
            >
              {action === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


