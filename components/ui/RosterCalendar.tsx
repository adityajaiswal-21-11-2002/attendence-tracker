"use client"

import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useState } from "react"

interface RosterEvent {
  date: Date
  shiftType: string
  shiftTime: {
    start: string
    end: string
  }
  employeeName?: string
  status?: "scheduled" | "confirmed" | "completed"
}

interface RosterCalendarProps {
  events?: RosterEvent[]
  onDateSelect?: (date: Date) => void
  className?: string
}

export function RosterCalendar({
  events = [],
  onDateSelect,
  className,
}: RosterCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      onDateSelect?.(date)
    }
  }

  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.date)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const selectedDateEvents = selectedDate
    ? getEventsForDate(selectedDate)
    : []

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader>
          <CardTitle>Roster Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      {selectedDate && selectedDateEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Events for {format(selectedDate, "MMMM dd, yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedDateEvents.map((event, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {event.employeeName || "Employee"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {event.shiftTime.start} - {event.shiftTime.end}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{event.shiftType}</Badge>
                    {event.status && (
                      <Badge
                        variant={
                          event.status === "confirmed"
                            ? "default"
                            : event.status === "completed"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {event.status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

