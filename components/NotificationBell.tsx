"use client"

import { useState, useEffect, useRef } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"

interface Notification {
  _id: string
  type: "leave_approval" | "announcement" | "system" | "message"
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications?limit=5")
      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()

    // Poll for new notifications every 30 seconds
    intervalRef.current = setInterval(() => {
      fetchNotifications()
    }, 30000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications/mark-read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      })
      fetchNotifications()
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "leave_approval":
        return "📋"
      case "announcement":
        return "📢"
      case "system":
        return "⚙️"
      case "message":
        return "💬"
      default:
        return "🔔"
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "leave_approval":
        return "text-blue-600"
      case "announcement":
        return "text-purple-600"
      case "system":
        return "text-gray-600"
      case "message":
        return "text-green-600"
      default:
        return "text-gray-600"
    }
  }

  // Get role-based notifications path
  const pathname = usePathname()
  const getNotificationsPath = () => {
    // Extract role from pathname or use generic path
    if (pathname?.includes("/admin")) {
      return "/dashboard/admin/notifications"
    } else if (pathname?.includes("/hr")) {
      return "/dashboard/hr/notifications"
    } else if (pathname?.includes("/operations")) {
      return "/dashboard/operations/notifications"
    } else if (pathname?.includes("/team-lead")) {
      return "/dashboard/team-lead/notifications"
    } else {
      return "/dashboard/notifications"
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification._id}
                className="flex flex-col items-start p-3 cursor-pointer hover:bg-muted"
                onClick={() => {
                  if (!notification.isRead) {
                    handleMarkAsRead(notification._id)
                  }
                }}
              >
                <div className="flex items-start gap-2 w-full">
                  <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm font-medium truncate",
                          !notification.isRead && "font-semibold"
                        )}
                      >
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(notification.createdAt), "MMM dd, HH:mm")}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <div className="border-t p-2">
            <Link
              href={getNotificationsPath()}
              className="text-sm text-primary hover:underline text-center block w-full"
            >
              View all notifications
            </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

