"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Edit, Trash2, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"

interface Task {
  _id: string
  rosterId: string
  rosterDate: string
  employeeName: string
  title: string
  description: string
  assignedBy: string
  createdAt: string
}

interface Roster {
  _id: string
  date: string
  userId: {
    _id: string
    name: string
  }
}

export default function TasksPage() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [rosters, setRosters] = useState<Roster[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [employees, setEmployees] = useState<Array<{ _id: string; name: string; email: string }>>([])
  const [formData, setFormData] = useState({
    rosterId: "",
    userId: "",
    date: "",
    title: "",
    description: "",
    dueDate: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [tasksRes, rostersRes, employeesRes] = await Promise.all([
        fetch("/api/roster/tasks"),
        fetch("/api/roster/calendar?startDate=2024-01-01&endDate=2024-12-31"),
        fetch("/api/roster/employees"),
      ])

      // Handle tasks response
      let tasksData: any = { tasks: [] }
      if (tasksRes.ok) {
        tasksData = await tasksRes.json()
      } else {
        const errorText = await tasksRes.text()
        console.error("Tasks API error:", tasksRes.status, errorText)
      }

      // Handle rosters response
      let rostersData: any = { rosters: [] }
      if (rostersRes.ok) {
        rostersData = await rostersRes.json()
      } else {
        const errorText = await rostersRes.text()
        console.error("Rosters API error:", rostersRes.status, errorText)
      }
      
      // Check employees response
      let employeesData: any = { employees: [] }
      if (!employeesRes.ok) {
        const errorText = await employeesRes.text()
        console.error("Employees API error:", employeesRes.status, errorText)
        toast({
          title: "Warning",
          description: `Failed to load employees list (${employeesRes.status}). Please check if you have active employees.`,
          variant: "destructive",
        })
      } else {
        employeesData = await employeesRes.json()
        console.log("Employees API response:", employeesData)
      }

      // Use tasks from API if available, otherwise transform from rosters
      let allTasks: Task[] = []
      
      if (tasksData.tasks && tasksData.tasks.length > 0) {
        // Use tasks from GET /api/roster/tasks endpoint
        allTasks = tasksData.tasks.map((task: any) => ({
          _id: task._id,
          rosterId: task.rosterId,
          rosterDate: task.rosterDate,
          employeeName: task.employeeName,
          title: task.title,
          description: task.description || "",
          assignedBy: task.assignedBy || "Unknown",
          createdAt: task.createdAt,
        }))
      } else {
        // Fallback: Transform roster tasks into task list
        rostersData.rosters?.forEach((roster: any) => {
          if (roster.tasks && roster.tasks.length > 0) {
            roster.tasks.forEach((task: any, index: number) => {
              allTasks.push({
                _id: `${roster._id}-${index}`,
                rosterId: roster._id,
                rosterDate: roster.date,
                employeeName: roster.userId?.name || "Unknown",
                title: task.title,
                description: task.description || "",
                assignedBy: task.assignedBy?.name || "Unknown",
                createdAt: roster.createdAt,
              })
            })
          }
        })
      }

      setTasks(allTasks)
      setRosters(rostersData.rosters || [])
      
      // Set employees - check if it's an array
      if (Array.isArray(employeesData.employees)) {
        setEmployees(employeesData.employees)
        console.log("Employees loaded:", employeesData.employees.length)
      } else if (Array.isArray(employeesData)) {
        setEmployees(employeesData)
        console.log("Employees loaded (direct array):", employeesData.length)
      } else {
        console.error("Invalid employees data structure:", employeesData)
        setEmployees([])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load data. Please refresh the page.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = selectedTask
        ? `/api/roster/tasks/${selectedTask.rosterId}`
        : "/api/roster/tasks"
      const method = selectedTask ? "PUT" : "POST"

      // Prepare request body - use rosterId if editing, otherwise use userId and date
      const requestBody: any = {
        title: formData.title,
        description: formData.description,
      }

      if (selectedTask && formData.rosterId) {
        // Editing existing task - use rosterId
        requestBody.rosterId = formData.rosterId
      } else {
        // Creating new task - use userId and date
        requestBody.userId = formData.userId
        requestBody.date = formData.date
      }

      if (formData.dueDate) {
        requestBody.dueDate = formData.dueDate
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: selectedTask ? "Task updated successfully" : "Task created successfully",
        })
        setDialogOpen(false)
        setSelectedTask(null)
        setFormData({
          rosterId: "",
          userId: "",
          date: "",
          title: "",
          description: "",
          dueDate: "",
        })
        fetchData()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save task",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving task:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (rosterId: string, taskIndex: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return

    try {
      const response = await fetch(`/api/roster/tasks/${rosterId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIndex }),
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error("Error deleting task:", error)
    }
  }

  const handleEdit = (task: Task) => {
    setSelectedTask(task)
    const roster = rosters.find((r) => r._id === task.rosterId)
    setFormData({
      rosterId: task.rosterId,
      userId: roster?.userId._id || "",
      date: roster ? format(new Date(roster.date), "yyyy-MM-dd") : "",
      title: task.title,
      description: task.description,
      dueDate: "",
    })
    setDialogOpen(true)
  }

  const handleNewTask = () => {
    setSelectedTask(null)
    setFormData({
      rosterId: "",
      userId: "",
      date: "",
      title: "",
      description: "",
      dueDate: "",
    })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task Assignment</h1>
          <p className="text-muted-foreground">
            Assign and manage daily tasks for employees
          </p>
        </div>
        <Button onClick={handleNewTask} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Create Task
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>
            A list of all assigned tasks linked to roster schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading tasks...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Task Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Assigned By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task._id}>
                    <TableCell>
                      {format(new Date(task.rosterDate), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {task.employeeName}
                    </TableCell>
                    <TableCell>{task.title}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {task.description || "No description"}
                    </TableCell>
                    <TableCell>{task.assignedBy}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(task)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleDelete(
                                task.rosterId,
                                parseInt(task._id.split("-")[1])
                              )
                            }
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTask ? "Edit Task" : "Assign New Task"}
            </DialogTitle>
            <DialogDescription>
              {selectedTask
                ? "Update task details"
                : "Assign a task to an employee's roster schedule"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="userId">Assign To *</Label>
                <Select
                  id="userId"
                  value={formData.userId}
                  onChange={(e) =>
                    setFormData({ ...formData, userId: e.target.value, rosterId: "" })
                  }
                  required
                >
                  <option value="">Select employee...</option>
                  {employees.length === 0 ? (
                    <option value="" disabled>No employees available</option>
                  ) : (
                    employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} ({emp.email})
                      </option>
                    ))
                  )}
                </Select>
                {employees.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No employees found. Make sure employees are created and active.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value, rosterId: "" })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                />
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

