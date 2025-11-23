"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, FileText, TrendingUp, Calendar, Users } from "lucide-react"
import { format } from "date-fns"
import AttendanceReport from "@/components/reports/AttendanceReport"
import SalaryReport from "@/components/reports/SalaryReport"
import LeaveReport from "@/components/reports/LeaveReport"
import ActivityCharts from "@/components/reports/ActivityCharts"

export default function ReportsPage() {
  const [reportType, setReportType] = useState<"attendance" | "salary" | "leave" | "activity">("attendance")
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  })
  const [filters, setFilters] = useState({
    department: "all",
    role: "all",
  })
  const [generating, setGenerating] = useState(false)

  const handleExport = async (format: "excel" | "pdf" | "csv") => {
    setGenerating(true)
    try {
      const response = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType,
          dateRange,
          filters,
          format,
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        const extension = format === "excel" ? "xlsx" : format
        a.download = `${reportType}-report-${format(new Date(), "yyyy-MM-dd")}.${extension}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const data = await response.json()
        alert(data.error || "Failed to export report")
      }
    } catch (error) {
      console.error("Error exporting report:", error)
      alert("Failed to export report")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Generate comprehensive reports and view analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport("excel")}
            disabled={generating}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport("pdf")}
            disabled={generating}
          >
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport("csv")}
            disabled={generating}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>Configure report parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type</Label>
              <Select
                id="reportType"
                value={reportType}
                onChange={(e) =>
                  setReportType(e.target.value as "attendance" | "salary" | "leave" | "activity")
                }
              >
                <option value="attendance">Attendance Report</option>
                <option value="salary">Salary Report</option>
                <option value="leave">Leave Report</option>
                <option value="activity">Activity Charts</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                id="department"
                value={filters.department}
                onChange={(e) =>
                  setFilters({ ...filters, department: e.target.value })
                }
              >
                <option value="all">All Departments</option>
                <option value="hr">HR</option>
                <option value="operations">Operations</option>
                <option value="sales">Sales</option>
                <option value="it">IT</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={reportType} onValueChange={(v) => setReportType(v as any)}>
        <TabsList>
          <TabsTrigger value="attendance">
            <Calendar className="mr-2 h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="salary">
            <FileText className="mr-2 h-4 w-4" />
            Salary
          </TabsTrigger>
          <TabsTrigger value="leave">
            <Users className="mr-2 h-4 w-4" />
            Leave
          </TabsTrigger>
          <TabsTrigger value="activity">
            <TrendingUp className="mr-2 h-4 w-4" />
            Activity Charts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-4">
          <AttendanceReport dateRange={dateRange} filters={filters} />
        </TabsContent>

        <TabsContent value="salary" className="space-y-4">
          <SalaryReport dateRange={dateRange} filters={filters} />
        </TabsContent>

        <TabsContent value="leave" className="space-y-4">
          <LeaveReport dateRange={dateRange} filters={filters} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <ActivityCharts dateRange={dateRange} filters={filters} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

