"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Settings, Download, RefreshCw, Plus, Calendar, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { format } from "date-fns"

interface Employee {
  _id: string
  name: string
  email: string
}

interface LeaveBalance {
  _id: string
  userId: { _id: string; name: string; email: string }
  year: number
  earnedLeave: number
  sickLeave: number
  compOff: number
  casualLeave: number
}

interface LeaveConfig {
  earnedLeave: number
  sickLeave: number
  compOff: number
  casualLeave: number
}

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

export default function HRLeavesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([])
  const [pendingLeaves, setPendingLeaves] = useState<Leave[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null)
  const [action, setAction] = useState<"approve" | "reject" | null>(null)
  const [comments, setComments] = useState("")
  const [processing, setProcessing] = useState(false)
  const [configData, setConfigData] = useState<LeaveConfig>({
    earnedLeave: 12,
    sickLeave: 6,
    compOff: 0,
    casualLeave: 6,
  })
  const [updateData, setUpdateData] = useState<LeaveConfig>({
    earnedLeave: 0,
    sickLeave: 0,
    compOff: 0,
    casualLeave: 0,
  })

  useEffect(() => {
    fetchData()
    fetchPendingLeaves()
  }, [selectedYear])

  const fetchData = async () => {
    try {
      const [employeesRes, balancesRes] = await Promise.all([
        fetch("/api/admin/employees"),
        fetch(`/api/leaves/balance?year=${selectedYear}&all=true`),
      ])

      const employeesData = await employeesRes.json()
      const balancesData = await balancesRes.json()

      setEmployees(employeesData.employees?.filter((u: any) => u.role === "employee") || [])
      setLeaveBalances(balancesData.balances || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingLeaves = async () => {
    try {
      const response = await fetch("/api/leaves/pending")
      const data = await response.json()
      setPendingLeaves(data.leaves || [])
    } catch (error) {
      console.error("Error fetching pending leaves:", error)
    }
  }

  const handleConfigure = (employee: Employee) => {
    setSelectedEmployee(employee)
    const existingBalance = leaveBalances.find(
      (b) => b.userId._id === employee._id
    )
    if (existingBalance) {
      setConfigData({
        earnedLeave: existingBalance.earnedLeave,
        sickLeave: existingBalance.sickLeave,
        compOff: existingBalance.compOff,
        casualLeave: existingBalance.casualLeave,
      })
    }
    setConfigDialogOpen(true)
  }

  const handleUpdate = (employee: Employee) => {
    setSelectedEmployee(employee)
    setUpdateData({
      earnedLeave: 0,
      sickLeave: 0,
      compOff: 0,
      casualLeave: 0,
    })
    setUpdateDialogOpen(true)
  }

  const handleConfigureSubmit = async () => {
    if (!selectedEmployee) return

    try {
      const response = await fetch("/api/leaves/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedEmployee._id,
          year: selectedYear,
          ...configData,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert("Leave balance configured successfully!")
        setConfigDialogOpen(false)
        fetchData()
      } else {
        alert(data.error || "Failed to configure leave balance")
      }
    } catch (error) {
      console.error("Error configuring leave:", error)
      alert("Failed to configure leave balance")
    }
  }

  const handleUpdateSubmit = async () => {
    if (!selectedEmployee) return

    try {
      const response = await fetch("/api/leaves/update-balance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedEmployee._id,
          year: selectedYear,
          ...updateData,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert("Leave balance updated successfully!")
        setUpdateDialogOpen(false)
        fetchData()
      } else {
        alert(data.error || "Failed to update leave balance")
      }
    } catch (error) {
      console.error("Error updating leave:", error)
      alert("Failed to update leave balance")
    }
  }

  const handleResetBalances = async () => {
    if (!confirm("Are you sure you want to reset all leave balances for this year? This action cannot be undone.")) {
      return
    }

    try {
      // Reset all balances to default values
      const promises = employees.map((employee) =>
        fetch("/api/leaves/configure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: employee._id,
            year: selectedYear,
            earnedLeave: 12,
            sickLeave: 6,
            compOff: 0,
            casualLeave: 6,
          }),
        })
      )

      await Promise.all(promises)
      alert("All leave balances have been reset successfully!")
      setResetDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error("Error resetting balances:", error)
      alert("Failed to reset leave balances")
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

  const getEmployeeBalance = (employeeId: string) => {
    return leaveBalances.find((b) => b.userId._id === employeeId)
  }

  const handleApprove = (leave: Leave) => {
    setSelectedLeave(leave)
    setAction("approve")
    setComments("")
    setApproveDialogOpen(true)
  }

  const handleReject = (leave: Leave) => {
    setSelectedLeave(leave)
    setAction("reject")
    setComments("")
    setApproveDialogOpen(true)
  }

  const handleApproveSubmit = async () => {
    if (!selectedLeave || processing) return

    if (action === "reject" && !comments.trim()) {
      alert("Comments are required for rejection")
      return
    }

    setProcessing(true)
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
        setApproveDialogOpen(false)
        setComments("")
        setSelectedLeave(null)
        setAction(null)
        fetchPendingLeaves()
      } else {
        alert(data.error || "Failed to process leave request")
      }
    } catch (error) {
      console.error("Error processing leave:", error)
      alert("Failed to process leave request")
    } finally {
      setProcessing(false)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Management</h1>
          <p className="text-muted-foreground">
            Configure and manage employee leave balances
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setResetDialogOpen(true)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset All Balances
          </Button>
          <Button onClick={handleDownloadReport}>
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Label htmlFor="year">Year:</Label>
        <Select
          id="year"
          value={selectedYear.toString()}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
        >
          <option value={(selectedYear - 1).toString()}>{selectedYear - 1}</option>
          <option value={selectedYear.toString()}>{selectedYear}</option>
          <option value={(selectedYear + 1).toString()}>{selectedYear + 1}</option>
        </Select>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Requests ({pendingLeaves.length})
          </TabsTrigger>
          <TabsTrigger value="balances">Leave Balances</TabsTrigger>
          <TabsTrigger value="configure">Configure Leave Types</TabsTrigger>
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
                              disabled={processing}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(leave)}
                              disabled={processing}
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

        <TabsContent value="balances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee Leave Balances - {selectedYear}</CardTitle>
              <CardDescription>
                View and manage leave balances for all employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No employees found
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Earned Leave</TableHead>
                        <TableHead>Sick Leave</TableHead>
                        <TableHead>Comp Off</TableHead>
                        <TableHead>Casual Leave</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((employee) => {
                        const balance = getEmployeeBalance(employee._id)
                        return (
                          <TableRow key={employee._id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{employee.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {employee.email}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {balance?.earnedLeave ?? 0}
                            </TableCell>
                            <TableCell>
                              {balance?.sickLeave ?? 0}
                            </TableCell>
                            <TableCell>
                              {balance?.compOff ?? 0}
                            </TableCell>
                            <TableCell>
                              {balance?.casualLeave ?? 0}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleConfigure(employee)}
                                >
                                  <Settings className="mr-2 h-4 w-4" />
                                  Configure
                                </Button>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleUpdate(employee)}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Update
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configure Leave Types</CardTitle>
              <CardDescription>
                Set default annual leave allotments for new employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="defaultEarned">Default Earned Leave (days/year)</Label>
                    <Input
                      id="defaultEarned"
                      type="number"
                      defaultValue={12}
                      min={0}
                      readOnly
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Standard annual leave allocation
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultSick">Default Sick Leave (days/year)</Label>
                    <Input
                      id="defaultSick"
                      type="number"
                      defaultValue={6}
                      min={0}
                      readOnly
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Medical leave allocation
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultCompOff">Default Comp Off (days/year)</Label>
                    <Input
                      id="defaultCompOff"
                      type="number"
                      defaultValue={0}
                      min={0}
                      readOnly
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Compensatory off (auto-generated for holiday work)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultCasual">Default Casual Leave (days/year)</Label>
                    <Input
                      id="defaultCasual"
                      type="number"
                      defaultValue={6}
                      min={0}
                      readOnly
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Casual leave allocation
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> These are default values. Individual employee balances
                    can be configured using the &quot;Configure&quot; button in the Leave Balances tab.
                    Comp Off is automatically generated when employees work on holidays.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Configure Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Leave Balance</DialogTitle>
            <DialogDescription>
              Set leave balances for {selectedEmployee?.name} ({selectedYear})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="configEarned">Earned Leave</Label>
              <Input
                id="configEarned"
                type="number"
                value={configData.earnedLeave}
                onChange={(e) =>
                  setConfigData({
                    ...configData,
                    earnedLeave: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="configSick">Sick Leave</Label>
              <Input
                id="configSick"
                type="number"
                value={configData.sickLeave}
                onChange={(e) =>
                  setConfigData({
                    ...configData,
                    sickLeave: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="configCompOff">Comp Off</Label>
              <Input
                id="configCompOff"
                type="number"
                value={configData.compOff}
                onChange={(e) =>
                  setConfigData({
                    ...configData,
                    compOff: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="configCasual">Casual Leave</Label>
              <Input
                id="configCasual"
                type="number"
                value={configData.casualLeave}
                onChange={(e) =>
                  setConfigData({
                    ...configData,
                    casualLeave: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfigureSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Leave Balance</DialogTitle>
            <DialogDescription>
              Add or subtract leave days for {selectedEmployee?.name} ({selectedYear})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="updateEarned">Earned Leave (use negative to subtract)</Label>
              <Input
                id="updateEarned"
                type="number"
                value={updateData.earnedLeave}
                onChange={(e) =>
                  setUpdateData({
                    ...updateData,
                    earnedLeave: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="updateSick">Sick Leave (use negative to subtract)</Label>
              <Input
                id="updateSick"
                type="number"
                value={updateData.sickLeave}
                onChange={(e) =>
                  setUpdateData({
                    ...updateData,
                    sickLeave: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="updateCompOff">Comp Off (use negative to subtract)</Label>
              <Input
                id="updateCompOff"
                type="number"
                value={updateData.compOff}
                onChange={(e) =>
                  setUpdateData({
                    ...updateData,
                    compOff: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="updateCasual">Casual Leave (use negative to subtract)</Label>
              <Input
                id="updateCasual"
                type="number"
                value={updateData.casualLeave}
                onChange={(e) =>
                  setUpdateData({
                    ...updateData,
                    casualLeave: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSubmit}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset All Leave Balances</DialogTitle>
            <DialogDescription>
              This will reset all employee leave balances for {selectedYear} to default values.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleResetBalances}>
              Reset All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={(open) => !processing && setApproveDialogOpen(open)}>
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
                disabled={processing}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setApproveDialogOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApproveSubmit}
              variant={action === "reject" ? "destructive" : "default"}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {action === "approve" ? "Approving..." : "Rejecting..."}
                </>
              ) : (
                action === "approve" ? "Approve" : "Reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

