"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Network,
  DollarSign,
  Calendar,
  Clock,
  FileText,
  Settings,
  Bell,
  Megaphone,
  TrendingUp,
  CheckCircle,
  Building2,
  CreditCard,
  LogOut,
} from "lucide-react"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { NotificationBell } from "@/components/NotificationBell"
import type { UserRole } from "@/types/auth"
import { canAccessResource } from "@/lib/permissions"

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  resource?: string
}

interface RoleBasedNavigationProps {
  user: {
    name: string
    email: string
    role: UserRole
    companyId?: string
  }
  companyName?: string
}

const navigationItems: Record<UserRole, NavigationItem[]> = {
  primary_admin: [
    { name: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
    { name: "Companies", href: "/dashboard/admin/companies", icon: Building2, resource: "companies" },
    { name: "Admins", href: "/dashboard/admin/admins", icon: Users, resource: "admins" },
    { name: "Subscriptions", href: "/dashboard/admin/subscriptions", icon: CreditCard, resource: "subscriptions" },
    { name: "Announcements", href: "/dashboard/admin/announcements", icon: Megaphone, resource: "announcements" },
    { name: "Broadcast", href: "/dashboard/admin/broadcast", icon: Megaphone, resource: "broadcast" },
  ],
  secondary_admin: [
    { name: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard },
    { name: "Employees", href: "/dashboard/admin/employees", icon: Users, resource: "employees" },
    { name: "Hierarchy", href: "/dashboard/admin/hierarchy", icon: Network, resource: "hierarchy" },
    { name: "Reports", href: "/dashboard/reports", icon: TrendingUp, resource: "reports" },
    { name: "Broadcast", href: "/dashboard/admin/broadcast", icon: Megaphone, resource: "broadcast" },
  ],
  hr_manager: [
    { name: "Dashboard", href: "/dashboard/hr", icon: LayoutDashboard },
    { name: "Employees", href: "/dashboard/admin/employees", icon: Users, resource: "employees" },
    { name: "Attendance", href: "/dashboard/hr/attendance", icon: Clock, resource: "attendance" },
    { name: "Hierarchy", href: "/dashboard/admin/hierarchy", icon: Network, resource: "hierarchy" },
    { name: "Leave Management", href: "/dashboard/hr/leaves", icon: Calendar, resource: "leaves" },
    { name: "Salary Config", href: "/dashboard/hr/salary/configure", icon: DollarSign, resource: "salary" },
    { name: "Payslips", href: "/dashboard/hr/salary/payslips", icon: FileText, resource: "salary" },
    { name: "Reports", href: "/dashboard/reports", icon: TrendingUp, resource: "reports" },
    { name: "Broadcast", href: "/dashboard/admin/broadcast", icon: Megaphone, resource: "broadcast" },
  ],
  operations_manager: [
    { name: "Dashboard", href: "/dashboard/operations", icon: LayoutDashboard },
    { name: "Attendance", href: "/dashboard/operations/attendance", icon: Clock, resource: "attendance" },
    { name: "Roster", href: "/dashboard/operations/roster", icon: Calendar, resource: "roster" },
    { name: "Tasks", href: "/dashboard/operations/roster/tasks", icon: CheckCircle, resource: "tasks" },
    { name: "Leaves", href: "/dashboard/operations/leaves", icon: Calendar, resource: "leaves" },
    { name: "Reports", href: "/dashboard/reports", icon: TrendingUp, resource: "reports" },
  ],
  team_lead: [
    { name: "Dashboard", href: "/dashboard/team-lead", icon: LayoutDashboard },
    { name: "Team Attendance", href: "/dashboard/team-lead/attendance", icon: Clock, resource: "attendance" },
    { name: "Team Roster", href: "/dashboard/team-lead/roster", icon: Calendar, resource: "roster" },
    { name: "Tasks", href: "/dashboard/team-lead/roster/tasks", icon: CheckCircle, resource: "tasks" },
    { name: "Leave Approval", href: "/dashboard/team-lead/leaves", icon: Calendar, resource: "leaves" },
    { name: "Reports", href: "/dashboard/reports", icon: TrendingUp, resource: "reports" },
  ],
  employee: [
    { name: "Dashboard", href: "/dashboard/employee", icon: LayoutDashboard },
    { name: "Attendance", href: "/dashboard/employee/attendance", icon: Clock, resource: "attendance" },
    { name: "Leaves", href: "/dashboard/employee/leaves", icon: Calendar, resource: "leaves" },
    { name: "Salary", href: "/dashboard/employee/salary", icon: DollarSign, resource: "salary" },
    { name: "Notifications", href: "/dashboard/notifications", icon: Bell, resource: "notifications" },
  ],
}

export function RoleBasedNavigation({ user, companyName }: RoleBasedNavigationProps) {
  const pathname = usePathname()
  const role = user.role

  // Get navigation items for the role
  const items = navigationItems[role] || []

  // Filter items based on permissions
  const filteredItems = items.filter((item) => {
    if (!item.resource) return true
    return canAccessResource(role, item.resource)
  })

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "primary_admin":
        return "Primary Admin"
      case "secondary_admin":
        return "Company Admin"
      case "hr_manager":
        return "HR Manager"
      case "operations_manager":
        return "Operations Manager"
      case "team_lead":
        return "Team Lead"
      case "employee":
        return "Employee"
      default:
        return role
    }
  }

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center justify-between border-b px-6">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold">Dashboard</h1>
          {companyName && (
            <p className="text-xs text-muted-foreground">{companyName}</p>
          )}
        </div>
        <NotificationBell />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {filteredItems.map((item) => {
          // Check for exact match first
          const isExactMatch = pathname === item.href
          // For startsWith check, ensure it's not matching a parent route when we're on a child route
          // Only match if pathname starts with item.href + "/" AND no other menu item's href is a closer match
          const isChildMatch = pathname?.startsWith(item.href + "/")
          
          // Check if any other menu item has a longer href that matches the current pathname
          // This prevents parent routes from being active when on child routes
          const hasCloserMatch = filteredItems.some(
            (otherItem) =>
              otherItem.href !== item.href &&
              otherItem.href.length > item.href.length &&
              pathname?.startsWith(otherItem.href)
          )
          
          const isActive = isExactMatch || (isChildMatch && !hasCloserMatch)
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-4">
        <div className="mb-2 px-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium">{user.name}</p>
            <Badge variant="outline" className="text-xs">
              {getRoleLabel(role)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}

