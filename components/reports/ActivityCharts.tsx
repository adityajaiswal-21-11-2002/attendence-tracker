"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/LoadingSpinner"

interface ActivityChartsProps {
  dateRange: { startDate: string; endDate: string }
  filters: { department: string; role: string }
}

export default function ActivityCharts({ dateRange, filters }: ActivityChartsProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCharts()
  }, [dateRange, filters])

  const fetchCharts = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/reports/activity-charts?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      )

      const result = await response.json()
      if (response.ok) {
        setData(result.charts)
      }
    } catch (error) {
      console.error("Error fetching activity charts:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center min-h-[300px]">
          <LoadingSpinner size="lg" text="Loading activity charts..." />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No data available</p>
          <p className="text-sm text-muted-foreground mt-2">
            Note: For enhanced visualizations with interactive charts, install recharts: npm install recharts
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Activity Charts</CardTitle>
          <CardDescription>
            Visual analytics for attendance, leaves, and productivity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Attendance Trends */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Attendance Trends</h3>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Monthly attendance data (Present/Absent/Half Day)
                </p>
                <div className="space-y-2">
                  {data.attendanceTrends.map((trend: any, index: number) => (
                    <div key={index} className="flex items-center gap-4">
                      <span className="w-24 text-sm">{trend.month}</span>
                      <div className="flex-1 flex gap-2">
                        <div
                          className="bg-green-500 text-white text-xs px-2 py-1 rounded"
                          style={{ width: `${(trend.present / trend.total) * 100}%` }}
                        >
                          {trend.present}
                        </div>
                        <div
                          className="bg-red-500 text-white text-xs px-2 py-1 rounded"
                          style={{ width: `${(trend.absent / trend.total) * 100}%` }}
                        >
                          {trend.absent}
                        </div>
                        <div
                          className="bg-yellow-500 text-white text-xs px-2 py-1 rounded"
                          style={{ width: `${(trend.halfDay / trend.total) * 100}%` }}
                        >
                          {trend.halfDay}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Leave Distribution */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Leave Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {data.leaveDistribution.map((item: any) => (
                  <div key={item.type} className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground capitalize">{item.type}</p>
                    <p className="text-2xl font-bold">{item.count}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Department Performance */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Department Performance</h3>
              <div className="space-y-2">
                {data.departmentPerformance.map((dept: any) => (
                  <div key={dept.department} className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium capitalize">{dept.department}</span>
                      <span className="text-sm text-muted-foreground">
                        {dept.percentage}% attendance
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1">Present</div>
                        <div className="h-2 bg-green-500 rounded" style={{ width: "100%" }} />
                        <div className="text-xs mt-1">{dept.present}</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground mb-1">Absent</div>
                        <div className="h-2 bg-red-500 rounded" style={{ width: "100%" }} />
                        <div className="text-xs mt-1">{dept.absent}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Peak Working Hours */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Peak Working Hours</h3>
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                  {data.peakHours.map((hour: any) => (
                    <div key={hour.hour} className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">
                        {hour.hour}:00
                      </div>
                      <div
                        className="bg-primary rounded text-white text-xs py-1"
                        style={{
                          height: `${(hour.count / Math.max(...data.peakHours.map((h: any) => h.count))) * 100}%`,
                          minHeight: "20px",
                        }}
                      >
                        {hour.count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

