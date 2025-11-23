"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, CheckCircle, XCircle, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface AttendanceStatusProps {
  status: "present" | "absent" | "leave" | "late" | "half-day"
  loginTime?: Date | string
  logoutTime?: Date | string
  date?: Date | string
  hoursWorked?: number
  className?: string
}

export function AttendanceStatus({
  status,
  loginTime,
  logoutTime,
  date,
  hoursWorked,
  className,
}: AttendanceStatusProps) {
  const statusConfig = {
    present: {
      label: "Present",
      icon: CheckCircle,
      variant: "default" as const,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    absent: {
      label: "Absent",
      icon: XCircle,
      variant: "destructive" as const,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    leave: {
      label: "On Leave",
      icon: Calendar,
      variant: "secondary" as const,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    late: {
      label: "Late",
      icon: Clock,
      variant: "outline" as const,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
    },
    "half-day": {
      label: "Half Day",
      icon: Clock,
      variant: "outline" as const,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Card
      className={cn(
        "border-2",
        config.borderColor,
        config.bgColor,
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Icon className={cn("h-5 w-5", config.color)} />
            <div>
              <p className="font-semibold">{config.label}</p>
              {date && (
                <p className="text-sm text-muted-foreground">
                  {format(new Date(date), "MMM dd, yyyy")}
                </p>
              )}
            </div>
          </div>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>

        {(loginTime || logoutTime || hoursWorked) && (
          <div className="mt-4 space-y-2 pt-4 border-t">
            {loginTime && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Login Time:</span>
                <span className="font-medium">
                  {format(new Date(loginTime), "hh:mm a")}
                </span>
              </div>
            )}
            {logoutTime && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Logout Time:</span>
                <span className="font-medium">
                  {format(new Date(logoutTime), "hh:mm a")}
                </span>
              </div>
            )}
            {hoursWorked !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Hours Worked:</span>
                <span className="font-medium">{hoursWorked.toFixed(2)} hrs</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

