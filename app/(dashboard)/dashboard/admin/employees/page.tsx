"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
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
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Edit, Trash2, Search } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Employee {
  _id: string
  name: string
  email: string
  phone?: string
  role: string
  jobRole: string
  managerId?: {
    _id: string
    name: string
  }
  salary: {
    type: string
    amount: number
    currency: string
  }
  shiftTime: {
    start: string
    end: string
  }
  offDays: string[]
  isActive: boolean
}

interface Manager {
  _id: string
  name: string
  role: string
}

export default function EmployeesPage() {
  const { toast } = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [managers, setManagers] = useState<Manager[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "employee",
    jobRole: "",
    managerId: "",
    salaryType: "fixed",
    salaryAmount: "",
    currency: "INR",
    shiftStart: "09:00",
    shiftEnd: "18:00",
    offDays: [] as string[],
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [employeesRes, managersRes] = await Promise.all([
        fetch("/api/admin/employees"),
        fetch("/api/admin/managers"),
      ])
      const employeesData = await employeesRes.json()
      const managersData = await managersRes.json()
      setEmployees(employeesData.employees || [])
      setManagers(managersData.managers || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const url = selectedEmployee
        ? `/api/admin/employees/${selectedEmployee._id}`
        : "/api/admin/employees"
      const method = selectedEmployee ? "PUT" : "POST"

      // Build request body with only fields expected by API
      const requestBody: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        role: formData.role,
        jobRole: formData.jobRole,
        salary: {
          type: formData.salaryType,
          amount: Number(formData.salaryAmount),
          currency: formData.currency,
        },
        shiftTime: {
          start: formData.shiftStart,
          end: formData.shiftEnd,
        },
        offDays: formData.offDays,
      }

      // Only include password and managerId if they have values
      if (!selectedEmployee && formData.password) {
        requestBody.password = formData.password
      }
      if (formData.managerId) {
        requestBody.managerId = formData.managerId
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
          description: selectedEmployee
            ? "Employee updated successfully"
            : "Employee created successfully",
        })
        setDialogOpen(false)
        setSelectedEmployee(null)
        resetForm()
        fetchData()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save employee",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving employee:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) return

    try {
      const response = await fetch(`/api/admin/employees/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error("Error deleting employee:", error)
    }
  }

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee)
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone || "",
      password: "",
      role: employee.role,
      jobRole: employee.jobRole,
      managerId: employee.managerId?._id || "",
      salaryType: employee.salary.type,
      salaryAmount: employee.salary.amount.toString(),
      currency: employee.salary.currency,
      shiftStart: employee.shiftTime.start,
      shiftEnd: employee.shiftTime.end,
      offDays: employee.offDays,
    })
    setDialogOpen(true)
  }

  const handleNewEmployee = () => {
    setSelectedEmployee(null)
    resetForm()
    setDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      password: "",
      role: "employee",
      jobRole: "",
      managerId: "",
      salaryType: "fixed",
      salaryAmount: "",
      currency: "INR",
      shiftStart: "09:00",
      shiftEnd: "18:00",
      offDays: [],
    })
  }

  const toggleOffDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      offDays: prev.offDays.includes(day)
        ? prev.offDays.filter((d) => d !== day)
        : [...prev.offDays, day],
    }))
  }

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.jobRole.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "all" || emp.role === roleFilter
    return matchesSearch && matchesRole
  })

  const weekDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employee Management</h1>
          <p className="text-muted-foreground">
            Manage employees, roles, and hierarchy
          </p>
        </div>
        <Button onClick={handleNewEmployee}>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="hr_manager">HR Manager</option>
              <option value="operations_manager">Operations Manager</option>
              <option value="team_lead">Team Lead</option>
              <option value="employee">Employee</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Employees</CardTitle>
          <CardDescription>
            A list of all employees in your company
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Job Role</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee._id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>
                      <span className="rounded-full px-2 py-1 text-xs bg-blue-100 text-blue-800">
                        {employee.role.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell>{employee.jobRole}</TableCell>
                    <TableCell>
                      {employee.managerId?.name || "No Manager"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          employee.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {employee.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(employee)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(employee._id)}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee ? "Edit Employee" : "Add New Employee"}
            </DialogTitle>
            <DialogDescription>
              {selectedEmployee
                ? "Update employee information"
                : "Create a new employee account with login credentials"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                {!selectedEmployee && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      required={!selectedEmployee}
                      minLength={6}
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    id="role"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    required
                  >
                    <option value="employee">Employee</option>
                    <option value="team_lead">Team Lead</option>
                    <option value="hr_manager">HR Manager</option>
                    <option value="operations_manager">Operations Manager</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobRole">Job Role *</Label>
                  <Input
                    id="jobRole"
                    value={formData.jobRole}
                    onChange={(e) =>
                      setFormData({ ...formData, jobRole: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="managerId">Manager</Label>
                <Select
                  id="managerId"
                  value={formData.managerId}
                  onChange={(e) =>
                    setFormData({ ...formData, managerId: e.target.value })
                  }
                >
                  <option value="">No Manager</option>
                  {managers.map((manager) => (
                    <option key={manager._id} value={manager._id}>
                      {manager.name} ({manager.role.replace("_", " ")})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salaryType">Salary Type *</Label>
                  <Select
                    id="salaryType"
                    value={formData.salaryType}
                    onChange={(e) =>
                      setFormData({ ...formData, salaryType: e.target.value })
                    }
                    required
                  >
                    <option value="fixed">Fixed</option>
                    <option value="hourly">Hourly</option>
                    <option value="commission">Commission</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salaryAmount">Amount *</Label>
                  <Input
                    id="salaryAmount"
                    type="number"
                    value={formData.salaryAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, salaryAmount: e.target.value })
                    }
                    required
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    id="currency"
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({ ...formData, currency: e.target.value })
                    }
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shiftStart">Shift Start *</Label>
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
                  <Label htmlFor="shiftEnd">Shift End *</Label>
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
              <div className="space-y-2">
                <Label>Off Days</Label>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleOffDay(day)}
                      className={`px-3 py-1 rounded-md text-sm border ${
                        formData.offDays.includes(day)
                          ? "bg-primary text-primary-foreground"
                          : "bg-background"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
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
                {submitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

