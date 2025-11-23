import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, Phone, MapPin, MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface EmployeeCardProps {
  id: string
  name: string
  email?: string
  phone?: string
  role?: string
  department?: string
  avatar?: string
  status?: "active" | "inactive" | "on-leave"
  location?: string
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  className?: string
}

export function EmployeeCard({
  id,
  name,
  email,
  phone,
  role,
  department,
  avatar,
  status = "active",
  location,
  onView,
  onEdit,
  onDelete,
  className,
}: EmployeeCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const statusColors = {
    active: "bg-green-500",
    inactive: "bg-gray-500",
    "on-leave": "bg-yellow-500",
  }

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={avatar} alt={name} />
              <AvatarFallback>{getInitials(name)}</AvatarFallback>
            </Avatar>
            <div
              className={cn(
                "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white",
                statusColors[status]
              )}
            />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{name}</h3>
            {role && (
              <p className="text-sm text-muted-foreground">{role}</p>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onView && (
              <DropdownMenuItem onClick={() => onView(id)}>
                View Details
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(id)}>
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(id)}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-2">
        {department && (
          <Badge variant="outline" className="text-xs">
            {department}
          </Badge>
        )}
        {email && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>{email}</span>
          </div>
        )}
        {phone && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>{phone}</span>
          </div>
        )}
        {location && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{location}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

