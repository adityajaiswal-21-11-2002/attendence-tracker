import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, User, MessageSquare } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface LeaveCardProps {
  id: string
  employeeName: string
  leaveType: string
  startDate: Date | string
  endDate: Date | string
  status: "pending" | "approved" | "rejected"
  reason?: string
  days?: number
  appliedDate?: Date | string
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onView?: (id: string) => void
  className?: string
}

export function LeaveCard({
  id,
  employeeName,
  leaveType,
  startDate,
  endDate,
  status,
  reason,
  days,
  appliedDate,
  onApprove,
  onReject,
  onView,
  className,
}: LeaveCardProps) {
  const statusConfig = {
    pending: {
      label: "Pending",
      variant: "outline" as const,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
    },
    approved: {
      label: "Approved",
      variant: "default" as const,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    rejected: {
      label: "Rejected",
      variant: "destructive" as const,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
  }

  const config = statusConfig[status]
  const start = new Date(startDate)
  const end = new Date(endDate)

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow border-2",
        config.borderColor,
        config.bgColor,
        className
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">{employeeName}</h3>
            <p className="text-sm text-muted-foreground">{leaveType}</p>
          </div>
          <Badge variant={config.variant}>{config.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">From:</span>
            <span className="font-medium">{format(start, "MMM dd, yyyy")}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">To:</span>
            <span className="font-medium">{format(end, "MMM dd, yyyy")}</span>
          </div>
          {days && (
            <div className="flex items-center space-x-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium">{days} day(s)</span>
            </div>
          )}
          {appliedDate && (
            <div className="flex items-center space-x-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Applied on:</span>
              <span className="font-medium">
                {format(new Date(appliedDate), "MMM dd, yyyy")}
              </span>
            </div>
          )}
        </div>

        {reason && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-start space-x-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">Reason</p>
                <p className="text-sm text-muted-foreground">{reason}</p>
              </div>
            </div>
          </div>
        )}

        {(onApprove || onReject || onView) && (
          <div className="flex items-center space-x-2 pt-2">
            {onView && (
              <Button variant="outline" size="sm" onClick={() => onView(id)}>
                View Details
              </Button>
            )}
            {status === "pending" && (
              <>
                {onApprove && (
                  <Button
                    size="sm"
                    onClick={() => onApprove(id)}
                    className="flex-1"
                  >
                    Approve
                  </Button>
                )}
                {onReject && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onReject(id)}
                    className="flex-1"
                  >
                    Reject
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

