"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Settings, Plus, Trash2, Edit } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"

interface Employee {
  _id: string
  name: string
  email: string
  role: string
  salary: {
    type: "fixed" | "hourly" | "commission"
    amount: number
    currency: string
  }
}

interface Deduction {
  name: string
  type: "fixed" | "percentage"
  amount: number
  isActive: boolean
}

interface SalaryConfig {
  userId: string
  salaryType: "fixed" | "hourly" | "commission"
  baseAmount: number
  currency: string
  deductions: Deduction[]
  overtimeEnabled: boolean
  overtimeRate: number
  standardHoursPerDay: number
  standardDaysPerMonth: number
}

export default function HRSalaryConfigurePage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [configurations, setConfigurations] = useState<Record<string, SalaryConfig>>({})
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [configData, setConfigData] = useState<SalaryConfig>({
    userId: "",
    salaryType: "fixed",
    baseAmount: 0,
    currency: "INR",
    deductions: [],
    overtimeEnabled: false,
    overtimeRate: 1.5,
    standardHoursPerDay: 8,
    standardDaysPerMonth: 22,
  })
  const [newDeduction, setNewDeduction] = useState({
    name: "",
    type: "fixed" as "fixed" | "percentage",
    amount: 0,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [employeesRes, configsRes] = await Promise.all([
        fetch("/api/admin/employees"),
        fetch("/api/salary/configurations"),
      ])

      const employeesData = await employeesRes.json()
      const configsData = await configsRes.json()

      const filteredEmployees = employeesData.employees?.filter(
        (e: Employee) => e.role === "employee"
      ) || []
      setEmployees(filteredEmployees)

      // Map configurations by userId
      const configMap: Record<string, SalaryConfig> = {}
      configsData.configurations?.forEach((config: any) => {
        configMap[config.userId] = config
      })
      setConfigurations(configMap)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfigure = (employee: Employee) => {
    setSelectedEmployee(employee)
    const existingConfig = configurations[employee._id]
    if (existingConfig) {
      setConfigData(existingConfig)
    } else {
      setConfigData({
        userId: employee._id,
        salaryType: employee.salary.type,
        baseAmount: employee.salary.amount,
        currency: employee.salary.currency,
        deductions: [],
        overtimeEnabled: false,
        overtimeRate: 1.5,
        standardHoursPerDay: 8,
        standardDaysPerMonth: 22,
      })
    }
    setDialogOpen(true)
  }

  const handleAddDeduction = () => {
    if (!newDeduction.name || newDeduction.amount <= 0) {
      alert("Please fill in deduction name and amount")
      return
    }
    setConfigData({
      ...configData,
      deductions: [
        ...configData.deductions,
        { ...newDeduction, isActive: true },
      ],
    })
    setNewDeduction({ name: "", type: "fixed", amount: 0 })
  }

  const handleRemoveDeduction = (index: number) => {
    setConfigData({
      ...configData,
      deductions: configData.deductions.filter((_, i) => i !== index),
    })
  }

  const handleSubmit = async () => {
    if (!selectedEmployee) return

    try {
      const response = await fetch("/api/salary/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configData),
      })

      const data = await response.json()

      if (response.ok) {
        alert("Salary configuration saved successfully!")
        setDialogOpen(false)
        fetchData()
      } else {
        alert(data.error || "Failed to save configuration")
      }
    } catch (error) {
      console.error("Error saving configuration:", error)
      alert("Failed to save configuration")
    }
  }

  const getSalaryTypeLabel = (type: string) => {
    switch (type) {
      case "fixed":
        return "Fixed"
      case "hourly":
        return "Hourly"
      case "commission":
        return "Commission"
      default:
        return type
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Loading salary configuration..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Salary Configuration</h1>
        <p className="text-muted-foreground">
          Configure salary settings, deductions, and overtime rules for employees
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Salary Configurations</CardTitle>
          <CardDescription>
            Manage salary settings for all employees
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
                    <TableHead>Salary Type</TableHead>
                    <TableHead>Base Amount</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => {
                    const config = configurations[employee._id]
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
                          {config ? (
                            <Badge>{getSalaryTypeLabel(config.salaryType)}</Badge>
                          ) : (
                            <Badge variant="outline">
                              {getSalaryTypeLabel(employee.salary.type)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {config
                            ? `${config.baseAmount.toLocaleString()}`
                            : `${employee.salary.amount.toLocaleString()}`}
                        </TableCell>
                        <TableCell>{config?.currency || employee.salary.currency}</TableCell>
                        <TableCell>
                          {config?.overtimeEnabled ? (
                            <Badge variant="default">Enabled</Badge>
                          ) : (
                            <Badge variant="outline">Disabled</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {config?.deductions?.length || 0} deduction(s)
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConfigure(employee)}
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            {config ? "Edit" : "Configure"}
                          </Button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure Salary</DialogTitle>
            <DialogDescription>
              Set up salary configuration for {selectedEmployee?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="salaryType">Salary Type</Label>
                <Select
                  id="salaryType"
                  value={configData.salaryType}
                  onChange={(e) =>
                    setConfigData({
                      ...configData,
                      salaryType: e.target.value as "fixed" | "hourly" | "commission",
                    })
                  }
                >
                  <option value="fixed">Fixed</option>
                  <option value="hourly">Hourly</option>
                  <option value="commission">Commission</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseAmount">Base Amount</Label>
                <Input
                  id="baseAmount"
                  type="number"
                  value={configData.baseAmount}
                  onChange={(e) =>
                    setConfigData({
                      ...configData,
                      baseAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  min={0}
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  id="currency"
                  value={configData.currency}
                  onChange={(e) =>
                    setConfigData({ ...configData, currency: e.target.value })
                  }
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </Select>
              </div>

              {configData.salaryType === "fixed" && (
                <div className="space-y-2">
                  <Label htmlFor="standardDaysPerMonth">Standard Days per Month</Label>
                  <Input
                    id="standardDaysPerMonth"
                    type="number"
                    value={configData.standardDaysPerMonth}
                    onChange={(e) =>
                      setConfigData({
                        ...configData,
                        standardDaysPerMonth: parseInt(e.target.value) || 22,
                      })
                    }
                    min={1}
                    max={31}
                  />
                </div>
              )}

              {configData.salaryType === "hourly" && (
                <div className="space-y-2">
                  <Label htmlFor="standardHoursPerDay">Standard Hours per Day</Label>
                  <Input
                    id="standardHoursPerDay"
                    type="number"
                    value={configData.standardHoursPerDay}
                    onChange={(e) =>
                      setConfigData({
                        ...configData,
                        standardHoursPerDay: parseInt(e.target.value) || 8,
                      })
                    }
                    min={1}
                    max={24}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="overtimeEnabled" className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="overtimeEnabled"
                    checked={configData.overtimeEnabled}
                    onChange={(e) =>
                      setConfigData({
                        ...configData,
                        overtimeEnabled: e.target.checked,
                      })
                    }
                  />
                  Enable Overtime Tracking
                </Label>
              </div>

              {configData.overtimeEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="overtimeRate">Overtime Rate (multiplier)</Label>
                  <Input
                    id="overtimeRate"
                    type="number"
                    value={configData.overtimeRate}
                    onChange={(e) =>
                      setConfigData({
                        ...configData,
                        overtimeRate: parseFloat(e.target.value) || 1.5,
                      })
                    }
                    min={1}
                    step="0.1"
                  />
                  <p className="text-xs text-muted-foreground">
                    e.g., 1.5 means 1.5x the hourly rate
                  </p>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-lg font-semibold">Deductions</Label>
              </div>

              <div className="space-y-4">
                {configData.deductions.map((deduction, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{deduction.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {deduction.type === "fixed"
                          ? `${deduction.amount.toLocaleString()} ${configData.currency}`
                          : `${deduction.amount}%`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveDeduction(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <div className="border-t pt-4 space-y-2">
                  <Label>Add New Deduction</Label>
                  <div className="grid gap-2 md:grid-cols-3">
                    <Input
                      placeholder="Deduction name"
                      value={newDeduction.name}
                      onChange={(e) =>
                        setNewDeduction({ ...newDeduction, name: e.target.value })
                      }
                    />
                    <Select
                      value={newDeduction.type}
                      onChange={(e) =>
                        setNewDeduction({
                          ...newDeduction,
                          type: e.target.value as "fixed" | "percentage",
                        })
                      }
                    >
                      <option value="fixed">Fixed Amount</option>
                      <option value="percentage">Percentage</option>
                    </Select>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={newDeduction.amount}
                        onChange={(e) =>
                          setNewDeduction({
                            ...newDeduction,
                            amount: parseFloat(e.target.value) || 0,
                          })
                        }
                        min={0}
                        step="0.01"
                      />
                      <Button onClick={handleAddDeduction}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

