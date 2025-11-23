"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { Save, Network } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Employee {
  _id: string
  name: string
  email: string
  role: string
  jobRole: string
  managerId?: string
}

interface HierarchyNode {
  employee: Employee
  reportees: HierarchyNode[]
}

export default function HierarchyPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [selectedManager, setSelectedManager] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [employeesRes, hierarchyRes] = await Promise.all([
        fetch("/api/admin/employees"),
        fetch("/api/admin/hierarchy"),
      ])
      const employeesData = await employeesRes.json()
      const hierarchyData = await hierarchyRes.json()
      setEmployees(employeesData.employees || [])
      setHierarchy(hierarchyData.hierarchy || [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateManager = async () => {
    if (!selectedEmployee || !selectedManager) {
      alert("Please select both employee and manager")
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/admin/hierarchy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployee,
          managerId: selectedManager === "none" ? null : selectedManager,
        }),
      })

      if (response.ok) {
        setSelectedEmployee("")
        setSelectedManager("")
        fetchData()
        alert("Hierarchy updated successfully")
      } else {
        alert("Failed to update hierarchy")
      }
    } catch (error) {
      console.error("Error updating hierarchy:", error)
      alert("An error occurred")
    } finally {
      setSaving(false)
    }
  }

  const buildHierarchyTree = (employees: Employee[]): HierarchyNode[] => {
    const employeeMap = new Map<string, Employee>()
    employees.forEach((emp) => employeeMap.set(emp._id, emp))

    const rootNodes: HierarchyNode[] = []
    const nodeMap = new Map<string, HierarchyNode>()

    // Create nodes for all employees
    employees.forEach((emp) => {
      nodeMap.set(emp._id, {
        employee: emp,
        reportees: [],
      })
    })

    // Build tree structure
    employees.forEach((emp) => {
      const node = nodeMap.get(emp._id)!
      if (emp.managerId && nodeMap.has(emp.managerId)) {
        const managerNode = nodeMap.get(emp.managerId)!
        managerNode.reportees.push(node)
      } else {
        rootNodes.push(node)
      }
    })

    return rootNodes
  }

  const renderNode = (node: HierarchyNode, level: number = 0) => {
    const indent = level * 40
    return (
      <div key={node.employee._id} className="mb-4">
        <div
          className="flex items-center gap-2 p-3 rounded-lg border bg-card"
          style={{ marginLeft: `${indent}px` }}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{node.employee.name}</p>
              <Badge variant="outline" className="text-xs">
                {node.employee.role.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {node.employee.jobRole}
            </p>
            <p className="text-xs text-muted-foreground">{node.employee.email}</p>
          </div>
          {node.reportees.length > 0 && (
            <Badge variant="secondary">{node.reportees.length} reportees</Badge>
          )}
        </div>
        {node.reportees.map((reportee) => renderNode(reportee, level + 1))}
      </div>
    )
  }

  const hierarchyTree = buildHierarchyTree(employees)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Organizational Hierarchy</h1>
        <p className="text-muted-foreground">
          Manage employee hierarchy and reporting structure
        </p>
      </div>

      {/* Update Manager Section */}
      <Card>
        <CardHeader>
          <CardTitle>Update Reporting Structure</CardTitle>
          <CardDescription>
            Assign managers to employees or update existing relationships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Employee</label>
              <Select
                value={selectedEmployee}
                onChange={(e) => {
                  const employeeId = e.target.value
                  setSelectedEmployee(employeeId)
                  const emp = employees.find((emp) => emp._id === employeeId)
                  if (emp) {
                    setSelectedManager(emp.managerId || "none")
                  }
                }}
              >
                <option value="">Choose employee...</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.role.replace("_", " ")})
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign Manager</label>
              <Select
                value={selectedManager}
                onChange={(e) => setSelectedManager(e.target.value)}
              >
                <option value="none">No Manager (Top Level)</option>
                {employees
                  .filter((emp) => emp._id !== selectedEmployee)
                  .map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.role.replace("_", " ")})
                    </option>
                  ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleUpdateManager}
                disabled={!selectedEmployee || saving}
                className="w-full"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Update Hierarchy"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Hierarchy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Organizational Chart
          </CardTitle>
          <CardDescription>
            Visual representation of your company hierarchy
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading hierarchy...</p>
          ) : hierarchyTree.length > 0 ? (
            <div className="space-y-2">
              {hierarchyTree.map((node) => renderNode(node))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              No hierarchy data available. Start by assigning managers to employees.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

