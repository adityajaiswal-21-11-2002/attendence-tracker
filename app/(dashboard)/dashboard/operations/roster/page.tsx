"use client"

import { useState, useEffect, useCallback } from "react"
import { RosterCalendar } from "@/components/roster/roster-calendar"
import type { RosterEvent } from "@/components/roster/roster-calendar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Plus, Copy, Users, Loader2, CheckSquare } from "lucide-react"
import Link from "next/link"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"
import { format, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth } from "date-fns"
import { useToast } from "@/hooks/use-toast"


interface Employee {
  _id: string
  name: string
  email: string
  role: string
  jobRole: string
}

export default function RosterPage() {
  const { toast } = useToast()
  const [events, setEvents] = useState<RosterEvent[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<RosterEvent | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [formData, setFormData] = useState({
    userId: "",
    shiftType: "morning",
    shiftStart: "09:00",
    shiftEnd: "18:00",
    jobRole: "",
  })

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      // Fetch entire month to ensure all events are visible in month view
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      
      // Create date objects at start and end of day in local time, then convert to ISO
      const startDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate(), 0, 0, 0, 0)
      const endDate = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate(), 23, 59, 59, 999)

      const [rosterRes, employeesRes] = await Promise.all([
        fetch(
          `/api/roster/calendar?startDate=${encodeURIComponent(startDate.toISOString())}&endDate=${encodeURIComponent(endDate.toISOString())}`
        ),
        fetch("/api/roster/employees"),
      ])

      // Handle roster response
      if (!rosterRes.ok) {
        const errorData = await rosterRes.json().catch(() => ({}))
        console.error("Roster API error:", errorData)
        const requestUrl = `/api/roster/calendar?startDate=${encodeURIComponent(startDate.toISOString())}&endDate=${encodeURIComponent(endDate.toISOString())}`
        console.error("Request URL:", requestUrl)
        console.error("Start date:", startDate.toISOString(), "End date:", endDate.toISOString())
        const errorDetails = errorData.details 
          ? errorData.details.map((d: any) => `${d.path?.join('.') || 'unknown'}: ${d.message}`).join(', ')
          : ''
        throw new Error(
          errorData.error 
            ? `${errorData.error}${errorDetails ? ` - ${errorDetails}` : ''}`
            : `Failed to fetch roster data (${rosterRes.status})`
        )
      }

      const rosterData = await rosterRes.json()
      
      // Handle employees response
      let employeesData = { employees: [] }
      if (employeesRes.ok) {
        employeesData = await employeesRes.json()
      } else {
        console.warn("Failed to fetch employees, continuing with empty list")
      }

      const formattedEvents = rosterData.rosters?.map((roster: any) => {
        const rosterDate = new Date(roster.date)
        // Set time to start of day for proper calendar display
        rosterDate.setHours(0, 0, 0, 0)
        return {
          id: roster._id,
          start: rosterDate,
          end: rosterDate,
          title: `${roster.userId?.name || "Unknown"} - ${roster.shiftType} (${roster.shiftTime.start}-${roster.shiftTime.end})`,
          userId: roster.userId?._id || roster.userId,
          userName: roster.userId?.name || "Unknown",
          shiftType: roster.shiftType,
          shiftTime: roster.shiftTime,
          jobRole: roster.jobRole,
          tasks: roster.tasks || [],
        }
      }) || []

      setEvents(formattedEvents)
      setEmployees(employeesData.employees || [])
    } catch (error: any) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load roster data. Please refresh the page.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [currentDate, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    setSelectedDate(slotInfo.start)
    setSelectedEvent(null)
    setFormData({
      userId: "",
      shiftType: "morning",
      shiftStart: "09:00",
      shiftEnd: "18:00",
      jobRole: "",
    })
    setDialogOpen(true)
  }

  const handleSelectEvent = (event: RosterEvent) => {
    setSelectedEvent(event as RosterEvent)
    setSelectedDate(event.start!)
    setFormData({
      userId: event.userId,
      shiftType: event.shiftType,
      shiftStart: event.shiftTime.start,
      shiftEnd: event.shiftTime.end,
      jobRole: event.jobRole,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || submitting) return

    try {
      setSubmitting(true)
      const url = selectedEvent
        ? `/api/roster/assign/${selectedEvent.id}`
        : "/api/roster/assign"
      const method = selectedEvent ? "PUT" : "POST"

      const employee = employees.find((e) => e._id === formData.userId)
      if (!employee) {
        toast({
          title: "Error",
          description: "Please select an employee",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: formData.userId,
          date: selectedDate.toISOString(),
          shiftType: formData.shiftType,
          shiftTime: {
            start: formData.shiftStart,
            end: formData.shiftEnd,
          },
          jobRole: employee.jobRole,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: selectedEvent
            ? "Roster updated successfully"
            : "Roster assigned successfully",
        })
        setDialogOpen(false)
        setSelectedDate(null)
        setSelectedEvent(null)
        setFormData({
          userId: "",
          shiftType: "morning",
          shiftStart: "09:00",
          shiftEnd: "18:00",
          jobRole: "",
        })
        // Refresh the calendar data
        await fetchData()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save roster assignment",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving roster:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyWeek = async () => {
    if (!confirm("Copy previous week's roster to current week?")) return

    try {
      const response = await fetch("/api/roster/copy-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetWeek: currentDate.toISOString(),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Roster copied successfully",
        })
        await fetchData()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to copy roster",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error copying roster:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleBulkAssign = () => {
    // Open bulk assign dialog
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Roster Management</h1>
          <p className="text-muted-foreground">
            Manage employee shifts and schedules
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/operations/roster/tasks">
            <Button>
              <CheckSquare className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          </Link>
          <Button variant="outline" onClick={handleCopyWeek}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Previous Week
          </Button>
          <Button variant="outline" onClick={handleBulkAssign}>
            <Users className="mr-2 h-4 w-4" />
            Bulk Assign
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Loading roster..." />
        </div>
      ) : (
        <RosterCalendar
          events={events}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          currentDate={currentDate}
          onNavigate={setCurrentDate}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedEvent ? "Edit Roster" : "Assign Shift"}
            </DialogTitle>
            <DialogDescription>
              {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="userId">Employee *</Label>
                <Select
                  id="userId"
                  value={formData.userId}
                  onChange={(e) => {
                    const employee = employees.find(
                      (emp) => emp._id === e.target.value
                    )
                    setFormData({
                      ...formData,
                      userId: e.target.value,
                      jobRole: employee?.jobRole || "",
                    })
                  }}
                  required
                >
                  <option value="">Select employee...</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.jobRole})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shiftType">Shift Type *</Label>
                <Select
                  id="shiftType"
                  value={formData.shiftType}
                  onChange={(e) => {
                    const type = e.target.value
                    setFormData({
                      ...formData,
                      shiftType: type,
                      shiftStart:
                        type === "morning"
                          ? "09:00"
                          : type === "evening"
                          ? "14:00"
                          : type === "night"
                          ? "22:00"
                          : "09:00",
                      shiftEnd:
                        type === "morning"
                          ? "18:00"
                          : type === "evening"
                          ? "22:00"
                          : type === "night"
                          ? "06:00"
                          : "18:00",
                    })
                  }}
                  required
                >
                  <option value="morning">Morning</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night</option>
                  <option value="custom">Custom</option>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shiftStart">Start Time *</Label>
                  <Input
                    id="shiftStart"
                    type="time"
                    value={formData.shiftStart}
                    onChange={(e) =>
                      setFormData({ ...formData, shiftStart: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shiftEnd">End Time *</Label>
                  <Input
                    id="shiftEnd"
                    type="time"
                    value={formData.shiftEnd}
                    onChange={(e) =>
                      setFormData({ ...formData, shiftEnd: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

