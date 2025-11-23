"use client"

import { useState, useMemo, useEffect } from "react"

import { Calendar, momentLocalizer, View, Event } from "react-big-calendar"
import { format } from "date-fns"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import moment from "moment"

interface RosterEvent extends Event {
  id: string
  userId: string
  userName: string
  shiftType: string
  shiftTime: {
    start: string
    end: string
  }
  jobRole: string
  tasks?: Array<{
    title: string
    description: string
  }>
}

interface RosterCalendarProps {
  events: RosterEvent[]
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void
  onSelectEvent?: (event: RosterEvent) => void
  currentDate?: Date
  onNavigate?: (date: Date) => void
}

const localizer = momentLocalizer(moment)

const shiftColors: Record<string, string> = {
  morning: "#10b981", // green
  evening: "#f59e0b", // amber
  night: "#6366f1", // indigo
  custom: "#8b5cf6", // purple
}

export function RosterCalendar({
  events,
  onSelectSlot,
  onSelectEvent,
  currentDate = new Date(),
  onNavigate,
}: RosterCalendarProps) {
  const [view, setView] = useState<View>("month")
  const [date, setDate] = useState(currentDate)

  // Sync date with currentDate prop when it changes
  useEffect(() => {
    setDate(currentDate)
  }, [currentDate])

  const { defaultDate, formats } = useMemo(
    () => ({
      defaultDate: date,
      formats: {
        dayFormat: "EEE",
        dayHeaderFormat: "EEEE, MMM d",
        dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
          `${format(start, "MMM d")} - ${format(end, "MMM d")}`,
        monthHeaderFormat: "MMMM yyyy",
        weekHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
          `${format(start, "MMM d")} - ${format(end, "MMM d")}`,
      },
    }),
    [date]
  )

  const eventStyleGetter = (event: RosterEvent) => {
    const color = shiftColors[event.shiftType] || "#6b7280"
    return {
      style: {
        backgroundColor: color,
        borderColor: color,
        color: "white",
        borderRadius: "4px",
        border: "none",
        padding: "2px 4px",
        fontSize: "12px",
      },
    }
  }

  const handleNavigate = (newDate: Date) => {
    setDate(newDate)
    onNavigate?.(newDate)
  }

  const handleToday = () => {
    const today = new Date()
    setDate(today)
    onNavigate?.(today)
  }

  const handlePrev = () => {
    const newDate = new Date(date)
    if (view === "month") {
      newDate.setMonth(newDate.getMonth() - 1)
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setDate(newDate.getDate() - 1)
    }
    setDate(newDate)
    onNavigate?.(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(date)
    if (view === "month") {
      newDate.setMonth(newDate.getMonth() + 1)
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setDate(newDate.getDate() + 1)
    }
    setDate(newDate)
    onNavigate?.(newDate)
  }

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-4 text-xl font-semibold">
            {format(date, "MMMM yyyy")}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("month")}
          >
            Month
          </Button>
          <Button
            variant={view === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("week")}
          >
            Week
          </Button>
          <Button
            variant={view === "day" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("day")}
          >
            Day
          </Button>
        </div>
      </div>

      <div className="mb-4 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-green-500"></div>
          <span>Morning</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-amber-500"></div>
          <span>Evening</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-indigo-500"></div>
          <span>Night</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-purple-500"></div>
          <span>Custom</span>
        </div>
      </div>

      <div style={{ height: "600px" }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          view={view}
          onView={setView}
          date={date}
          onNavigate={handleNavigate}
          defaultDate={defaultDate}
          formats={formats}
          selectable
          onSelectSlot={onSelectSlot}
          onSelectEvent={onSelectEvent}
          eventPropGetter={eventStyleGetter}
          popup
        />
      </div>
    </Card>
  )
}

