"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, User, Briefcase } from "lucide-react"
import { format } from "date-fns"

interface StatusCardProps {
  employee: {
    name: string
    email: string
    role: string
    status: "logged_in" | "on_break" | "logged_out"
    loginTime?: Date
    currentShift?: string
  }
}

export function StatusCard({ employee }: StatusCardProps) {
  const getStatusColor = () => {
    switch (employee.status) {
      case "logged_in":
        return "bg-green-100 text-green-800 border-green-300"
      case "on_break":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "logged_out":
        return "bg-gray-100 text-gray-800 border-gray-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const getStatusText = () => {
    switch (employee.status) {
      case "logged_in":
        return "Logged In"
      case "on_break":
        return "On Break"
      case "logged_out":
        return "Logged Out"
      default:
        return "Unknown"
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">{employee.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{employee.email}</p>
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{employee.role.replace("_", " ")}</span>
            </div>
            {employee.loginTime && employee.status !== "logged_out" && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Since {format(new Date(employee.loginTime), "HH:mm")}
                </span>
              </div>
            )}
          </div>
          <Badge className={getStatusColor()}>{getStatusText()}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}

