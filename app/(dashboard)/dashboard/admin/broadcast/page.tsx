"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Send, Users, User, Building2 } from "lucide-react"
import { format } from "date-fns"

interface Employee {
  _id: string
  name: string
  email: string
  role: string
}

interface BroadcastHistory {
  _id: string
  title: string
  message: string
  type: string
  sentTo: number
  createdAt: string
}

export default function AdminBroadcastPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [sendToAll, setSendToAll] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "announcement" as "announcement" | "system" | "message",
  })
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState<BroadcastHistory[]>([])

  // Fetch employees on mount
  useEffect(() => {
    fetchEmployees()
    fetchHistory()
  }, [])

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/admin/employees")
      const data = await response.json()
      setEmployees(data.employees?.filter((e: Employee) => e.role === "employee") || [])
    } catch (error) {
      console.error("Error fetching employees:", error)
    }
  }

  const fetchHistory = async () => {
    // In a real app, this would fetch from a broadcast history API
    // For now, we'll just show a placeholder
    setHistory([])
  }

  const handleSendBroadcast = async () => {
    if (!formData.title || !formData.message) {
      alert("Please fill in title and message")
      return
    }

    if (!sendToAll && selectedEmployees.length === 0 && selectedRoles.length === 0) {
      alert("Please select recipients")
      return
    }

    setSending(true)
    try {
      const response = await fetch("/api/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          sendToAll,
          targetUserIds: sendToAll ? undefined : selectedEmployees,
          targetRoles: sendToAll ? undefined : selectedRoles,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(`Notification sent to ${data.count} user(s)!`)
        setFormData({ title: "", message: "", type: "announcement" })
        setSelectedEmployees([])
        setSelectedRoles([])
        setSendToAll(false)
        fetchHistory()
      } else {
        alert(data.error || "Failed to send notification")
      }
    } catch (error) {
      console.error("Error sending broadcast:", error)
      alert("Failed to send notification")
    } finally {
      setSending(false)
    }
  }

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    )
  }

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  const roles = ["employee", "hr_manager", "operations_manager", "team_lead"]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Broadcast Messages</h1>
        <p className="text-muted-foreground">
          Send notifications to employees, departments, or all users
        </p>
      </div>

      <Tabs defaultValue="send" className="space-y-4">
        <TabsList>
          <TabsTrigger value="send">Send Message</TabsTrigger>
          <TabsTrigger value="history">Message History</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compose Message</CardTitle>
              <CardDescription>
                Create and send notifications to your team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Notification Type</Label>
                <Select
                  id="type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as "announcement" | "system" | "message",
                    })
                  }
                >
                  <option value="announcement">Announcement</option>
                  <option value="system">System Notification</option>
                  <option value="message">Message</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter notification title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  placeholder="Enter notification message"
                  rows={6}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendToAll"
                    checked={sendToAll}
                    onChange={(e) => {
                      setSendToAll(e.target.checked)
                      if (e.target.checked) {
                        setSelectedEmployees([])
                        setSelectedRoles([])
                      }
                    }}
                  />
                  <Label htmlFor="sendToAll" className="cursor-pointer">
                    Send to all employees
                  </Label>
                </div>

                {!sendToAll && (
                  <>
                    <div className="space-y-2">
                      <Label>Select by Role</Label>
                      <div className="flex flex-wrap gap-2">
                        {roles.map((role) => (
                          <Badge
                            key={role}
                            variant={selectedRoles.includes(role) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleRole(role)}
                          >
                            {role.replace("_", " ").toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Select Individual Employees</Label>
                      <div className="max-h-60 overflow-y-auto border rounded-lg p-2">
                        {employees.map((employee) => (
                          <div
                            key={employee._id}
                            className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                            onClick={() => toggleEmployee(employee._id)}
                          >
                            <input
                              type="checkbox"
                              checked={selectedEmployees.includes(employee._id)}
                              onChange={() => toggleEmployee(employee._id)}
                            />
                            <div>
                              <p className="text-sm font-medium">{employee.name}</p>
                              <p className="text-xs text-muted-foreground">{employee.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Button onClick={handleSendBroadcast} disabled={sending} className="w-full">
                <Send className="mr-2 h-4 w-4" />
                {sending ? "Sending..." : "Send Notification"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message History</CardTitle>
              <CardDescription>View past broadcast messages</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No broadcast history yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Sent To</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>{item.title}</TableCell>
                        <TableCell>
                          <Badge>{item.type}</Badge>
                        </TableCell>
                        <TableCell>{item.sentTo} users</TableCell>
                        <TableCell>
                          {format(new Date(item.createdAt), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

