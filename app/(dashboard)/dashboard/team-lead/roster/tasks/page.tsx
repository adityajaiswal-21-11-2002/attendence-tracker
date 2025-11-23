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
import { Plus, Edit, Trash2 } from "lucide-react"
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

export default function TeamLeadTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [rosters, setRosters] = useState<Roster[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [formData, setFormData] = useState({
    rosterId: "",
    title: "",
    description: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [tasksRes, rostersRes] = await Promise.all([
        fetch("/api/roster/tasks"),
        fetch("/api/roster/calendar?start=2024-01-01&end=2024-12-31"),
      ])

      const tasksData = await tasksRes.json()
      const rostersData = await rostersRes.json()

      const allTasks: Task[] = []
      rostersData.rosters?.forEach((roster: any) => {
        if (roster.tasks && roster.tasks.length > 0) {
          roster.tasks.forEach((task: any, index: number) => {
            allTasks.push({
              _id: `${roster._id}-${index}`,
              rosterId: roster._id,
              rosterDate: roster.date,
              employeeName: roster.userId.name,
              title: task.title,
              description: task.description || "",
              assignedBy: task.assignedBy?.name || "Unknown",
              createdAt: roster.createdAt,
            })
          })
        }
      })

      setTasks(allTasks)
      setRosters(rostersData.rosters || [])
    } catch (error) {
      console.error("Error fetching data:", error)
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

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setDialogOpen(false)
        setSelectedTask(null)
        setFormData({
          rosterId: "",
          title: "",
          description: "",
        })
        fetchData()
      }
    } catch (error) {
      console.error("Error saving task:", error)
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
    setFormData({
      rosterId: task.rosterId,
      title: task.title,
      description: task.description,
    })
    setDialogOpen(true)
  }

  const handleNewTask = () => {
    setSelectedTask(null)
    setFormData({
      rosterId: "",
      title: "",
      description: "",
    })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task Assignment</h1>
          <p className="text-muted-foreground">
            Assign and manage daily tasks for team members
          </p>
        </div>
        <Button onClick={handleNewTask}>
          <Plus className="mr-2 h-4 w-4" />
          Assign Task
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
                <Label htmlFor="rosterId">Roster Schedule *</Label>
                <Select
                  id="rosterId"
                  value={formData.rosterId}
                  onChange={(e) =>
                    setFormData({ ...formData, rosterId: e.target.value })
                  }
                  required
                >
                  <option value="">Select roster...</option>
                  {rosters.map((roster) => (
                    <option key={roster._id} value={roster._id}>
                      {roster.userId.name} - {format(new Date(roster.date), "MMM dd, yyyy")}
                    </option>
                  ))}
                </Select>
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

