import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"
import { ReactNode } from "react"

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
  iconClassName?: string
  children?: ReactNode
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  iconClassName,
  children,
}: StatCardProps) {
  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {Icon && (
          <Icon className={cn("h-4 w-4 text-muted-foreground", iconClassName)} />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <p
            className={cn(
              "text-xs mt-1",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}% from last period
          </p>
        )}
        {children}
      </CardContent>
    </Card>
  )
}

