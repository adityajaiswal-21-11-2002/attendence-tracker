"use client"

import { useState, useEffect, useCallback } from "react"
import { RosterCalendar, RosterEvent } from "@/components/roster/roster-calendar"
import { Button } from "@/components/ui/button"
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
import { Copy, Users } from "lucide-react"
import { format, startOfWeek, endOfWeek } from "date-fns"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"

interface Employee {
  _id: string
  name: string
  email: string
  role: string
  jobRole: string
}

export default function TeamLeadRosterPage() {
  const [events, setEvents] = useState<RosterEvent[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
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
      const startDate = startOfWeek(currentDate, { weekStartsOn: 1 })
      const endDate = endOfWeek(currentDate, { weekStartsOn: 1 })

      const [rosterRes, employeesRes] = await Promise.all([
        fetch(
          `/api/roster/calendar?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
        ),
        fetch("/api/roster/employees"),
      ])

      const rosterData = await rosterRes.json()
      const employeesData = await employeesRes.json()

      const formattedEvents = rosterData.rosters?.map((roster: any) => ({
        id: roster._id,
        start: new Date(roster.date),
        end: new Date(roster.date),
        userId: roster.userId._id,
        userName: roster.userId.name,
        shiftType: roster.shiftType,
        shiftTime: roster.shiftTime,
        jobRole: roster.jobRole,
        tasks: roster.tasks || [],
      })) || []

      setEvents(formattedEvents)
      setEmployees(employeesData.employees || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }, [currentDate])

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
    setSelectedEvent(event)
    setSelectedDate(event.start || null)
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
    if (!selectedDate) return

    try {
      const url = selectedEvent
        ? `/api/roster/assign/${selectedEvent.id}`
        : "/api/roster/assign"
      const method = selectedEvent ? "PUT" : "POST"

      const employee = employees.find((e) => e._id === formData.userId)
      if (!employee) {
        alert("Please select an employee")
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

      if (response.ok) {
        setDialogOpen(false)
        setSelectedDate(null)
        setSelectedEvent(null)
        fetchData()
      }
    } catch (error) {
      console.error("Error saving roster:", error)
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

      if (response.ok) {
        alert("Roster copied successfully")
        fetchData()
      }
    } catch (error) {
      console.error("Error copying roster:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Roster Management</h1>
          <p className="text-muted-foreground">
            Manage team shifts and schedules
          </p>
        </div>
        <Button variant="outline" onClick={handleCopyWeek}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Previous Week
        </Button>
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
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

