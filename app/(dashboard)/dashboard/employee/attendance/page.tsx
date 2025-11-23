"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Timer } from "@/components/attendance/timer"
import { LogIn, LogOut, Coffee, Play, Pause } from "lucide-react"
import { format, differenceInHours, differenceInMinutes, startOfMonth, endOfMonth, subMonths } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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

interface AttendanceStatus {
  isLoggedIn: boolean
  isOnBreak: boolean
  loginTime?: string
  logoutTime?: string
  breakStartTime?: string
  totalBreakDuration: number
  currentShift?: {
    start: string
    end: string
  }
}

interface Task {
  _id: string
  title: string
  description?: string
  status: string
  timeTracking?: {
    startTime?: string
    pausedDuration?: number
    endTime?: string
    totalDuration?: number
  }
}

interface AttendanceHistory {
  _id: string
  date: string
  loginTime?: string
  logoutTime?: string
  totalHours?: number
  status: string
  breaks: Array<{
    breakIn: string
    breakOut?: string
  }>
}

export default function EmployeeAttendancePage() {
  const { toast } = useToast()
  const [attendance, setAttendance] = useState<AttendanceStatus>({
    isLoggedIn: false,
    isOnBreak: false,
    totalBreakDuration: 0,
  })
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [elapsedTime, setElapsedTime] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // History tab state
  const [history, setHistory] = useState<AttendanceHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [startDate, setStartDate] = useState(
    format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd")
  )
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"))

  useEffect(() => {
    fetchStatus()
    fetchTasks()

    // Poll for status updates every 5 seconds
    const statusInterval = setInterval(fetchStatus, 5000)

    return () => {
      clearInterval(statusInterval)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (attendance.isLoggedIn && attendance.loginTime && !attendance.isOnBreak) {
      intervalRef.current = setInterval(() => {
        const now = new Date()
        const login = new Date(attendance.loginTime!)
        const elapsed = Math.floor((now.getTime() - login.getTime()) / 1000)
        setElapsedTime(elapsed - attendance.totalBreakDuration)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [attendance.isLoggedIn, attendance.loginTime, attendance.isOnBreak, attendance.totalBreakDuration])

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/attendance/live-status")
      const data = await response.json()
      if (data.attendance) {
        setAttendance(data.attendance)
      }
    } catch (error) {
      console.error("Error fetching status:", error)
    }
  }

  const fetchTasks = async () => {
    try {
      const today = new Date().toISOString().split("T")[0]
      const response = await fetch(`/api/attendance/tasks?date=${today}`)
      const data = await response.json()
      setTasks(data.tasks || [])
    } catch (error) {
      console.error("Error fetching tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    try {
      const response = await fetch("/api/attendance/login", {
        method: "POST",
      })
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Successfully logged in",
          variant: "default",
        })
        fetchStatus()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to log in",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error logging in:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/attendance/logout", {
        method: "POST",
      })
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Successfully logged out",
          variant: "default",
        })
        fetchStatus()
        setElapsedTime(0)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to log out",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error logging out:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const handleBreakIn = async () => {
    try {
      const response = await fetch("/api/attendance/break", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "break_in" }),
      })
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Break started",
          variant: "default",
        })
        fetchStatus()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to start break",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error starting break:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const handleBreakOut = async () => {
    try {
      const response = await fetch("/api/attendance/break", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "break_out" }),
      })
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Break ended",
          variant: "default",
        })
        fetchStatus()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to end break",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error ending break:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    }
  }

  const handleTaskAction = async (
    taskId: string,
    action: "start" | "pause" | "complete"
  ) => {
    try {
      const response = await fetch("/api/attendance/task-timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          action,
        }),
      })
      if (response.ok) {
        fetchTasks()
      }
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const calculateTimeRemaining = () => {
    if (!attendance.currentShift || !attendance.loginTime) return null

    const now = new Date()
    const shiftEnd = new Date(
      `${now.toISOString().split("T")[0]}T${attendance.currentShift.end}:00`
    )

    if (now > shiftEnd) return "Shift ended"

    const remaining = Math.floor((shiftEnd.getTime() - now.getTime()) / 1000)
    return formatTime(remaining)
  }

  const fetchHistory = async () => {
    if (!startDate || !endDate) return

    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return
    }
    
    if (end < start) {
      toast({
        title: "Invalid Date Range",
        description: "End date must be after start date",
        variant: "destructive",
      })
      return
    }

    setHistoryLoading(true)
    try {
      const response = await fetch(
        `/api/attendance/history?startDate=${startDate}&endDate=${endDate}`
      )
      const data = await response.json()
      
      if (response.ok) {
        setHistory(data.history || [])
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch attendance history",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching history:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    // Fetch history when date range changes
    fetchHistory()
  }, [startDate, endDate])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Attendance</h1>
        <p className="text-muted-foreground">Track your daily attendance and work hours</p>
      </div>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="today">Today&apos;s Attendance</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-6">
          {/* Attendance Controls */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
            <CardDescription>Login and logout from your shift</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!attendance.isLoggedIn ? (
              <Button
                size="lg"
                className="w-full h-20 text-lg"
                onClick={handleLogin}
              >
                <LogIn className="mr-2 h-6 w-6" />
                Login
              </Button>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Logged in at</p>
                  <p className="text-2xl font-bold">
                    {attendance.loginTime &&
                      format(new Date(attendance.loginTime), "HH:mm:ss")}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!attendance.isOnBreak ? (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleBreakIn}
                    >
                      <Coffee className="mr-2 h-4 w-4" />
                      Break In
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleBreakOut}
                    >
                      <Pause className="mr-2 h-4 w-4" />
                      Break Out
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Summary</CardTitle>
            <CardDescription>Your current shift information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {attendance.currentShift && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Shift Time:</span>
                  <span className="font-medium">
                    {attendance.currentShift.start} - {attendance.currentShift.end}
                  </span>
                </div>
                {attendance.isLoggedIn && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Time Logged:</span>
                      <span className="font-mono font-bold text-lg">
                        {formatTime(elapsedTime)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Time Remaining:</span>
                      <span className="font-medium">
                        {calculateTimeRemaining() || "N/A"}
                      </span>
                    </div>
                    {attendance.totalBreakDuration > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Break Time:</span>
                        <span className="font-medium">
                          {formatTime(attendance.totalBreakDuration)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="pt-2">
              <Badge
                variant={
                  attendance.isLoggedIn
                    ? attendance.isOnBreak
                      ? "secondary"
                      : "default"
                    : "outline"
                }
                className="w-full justify-center py-2"
              >
                {attendance.isLoggedIn
                  ? attendance.isOnBreak
                    ? "On Break"
                    : "Active"
                  : "Not Logged In"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Tasks</CardTitle>
          <CardDescription>Track time spent on assigned tasks</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="text-muted-foreground">No tasks assigned for today</p>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => {
                const isRunning =
                  task.status === "in_progress" &&
                  task.timeTracking?.startTime &&
                  !task.timeTracking.endTime
                const isPaused =
                  task.status === "paused" &&
                  task.timeTracking?.startTime &&
                  !task.timeTracking.endTime

                return (
                  <div
                    key={task._id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{task.title}</h3>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          task.status === "completed"
                            ? "default"
                            : task.status === "in_progress"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>
                    {task.timeTracking?.startTime && (
                      <Timer
                        startTime={new Date(task.timeTracking.startTime)}
                        pausedDuration={task.timeTracking.pausedDuration || 0}
                        isRunning={isRunning}
                        isPaused={isPaused}
                        onStart={() => handleTaskAction(task._id, "start")}
                        onPause={() => handleTaskAction(task._id, "pause")}
                        onStop={() => handleTaskAction(task._id, "complete")}
                      />
                    )}
                    {!task.timeTracking?.startTime &&
                      task.status === "not_started" && (
                        <Button
                          size="sm"
                          onClick={() => handleTaskAction(task._id, "start")}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Start Task
                        </Button>
                      )}
                    {task.status === "completed" &&
                      task.timeTracking?.totalDuration && (
                        <div className="text-sm text-muted-foreground">
                          Total time:{" "}
                          {formatTime(task.timeTracking.totalDuration * 60)}
                        </div>
                      )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>
                View your login and logout times for any date range
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                History will automatically update when you change the date range. Only dates where you logged in are shown.
              </p>

              {historyLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading attendance history...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No attendance records found for the selected date range.
                    <br />
                    Only dates where you logged in are shown.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Login Time</TableHead>
                        <TableHead>Logout Time</TableHead>
                        <TableHead>Total Hours</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((record) => (
                        <TableRow key={record._id}>
                          <TableCell className="font-medium">
                            {format(new Date(record.date), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell>
                            {record.loginTime
                              ? format(new Date(record.loginTime), "HH:mm:ss")
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {record.logoutTime
                              ? format(new Date(record.logoutTime), "HH:mm:ss")
                              : "Not logged out"}
                          </TableCell>
                          <TableCell>
                            {record.totalHours
                              ? `${record.totalHours.toFixed(2)} hrs`
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                record.status === "present"
                                  ? "default"
                                  : record.status === "half_day"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {record.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

