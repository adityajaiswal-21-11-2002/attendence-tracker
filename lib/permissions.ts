import type { UserRole } from "@/types/auth"

export interface Permission {
  resource: string
  action: string
  allowed: boolean
}

/**
 * Permission utility for role-based access control
 */

/**
 * Check if user can access a specific resource
 */
export function canAccessResource(userRole: UserRole, resource: string): boolean {
  const permissions: Record<UserRole, string[]> = {
    primary_admin: [
      "companies",
      "admins",
      "subscriptions",
      "employees",
      "hierarchy",
      "attendance",
      "leaves",
      "salary",
      "roster",
      "tasks",
      "reports",
      "announcements",
      "broadcast",
    ],
    secondary_admin: [
      "employees",
      "hierarchy",
      "attendance",
      "leaves",
      "salary",
      "roster",
      "tasks",
      "reports",
      "announcements",
      "broadcast",
    ],
    hr_manager: [
      "employees",
      "hierarchy",
      "attendance",
      "leaves",
      "salary",
      "reports",
      "announcements",
      "broadcast",
    ],
    operations_manager: [
      "attendance",
      "roster",
      "tasks",
      "leaves",
      "reports",
      "broadcast",
    ],
    team_lead: [
      "attendance",
      "roster",
      "tasks",
      "leaves",
      "reports",
    ],
    employee: [
      "attendance",
      "leaves",
      "salary",
      "roster",
      "tasks",
    ],
  }

  return permissions[userRole]?.includes(resource) || false
}

/**
 * Check if user can perform a specific action
 */
export function canPerformAction(
  userRole: UserRole,
  resource: string,
  action: string
): boolean {
  // Define action permissions for each role-resource combination
  const actionPermissions: Record<string, Record<UserRole, string[]>> = {
    "employees.create": {
      primary_admin: ["create"],
      secondary_admin: ["create"],
      hr_manager: ["create"],
      operations_manager: [],
      team_lead: [],
      employee: [],
    },
    "employees.edit": {
      primary_admin: ["edit"],
      secondary_admin: ["edit"],
      hr_manager: ["edit"],
      operations_manager: [],
      team_lead: [],
      employee: [],
    },
    "employees.delete": {
      primary_admin: ["delete"],
      secondary_admin: ["delete"],
      hr_manager: ["delete"],
      operations_manager: [],
      team_lead: [],
      employee: [],
    },
    "salary.configure": {
      primary_admin: ["configure"],
      secondary_admin: ["configure"],
      hr_manager: ["configure"],
      operations_manager: [],
      team_lead: [],
      employee: [],
    },
    "salary.view": {
      primary_admin: ["view"],
      secondary_admin: ["view"],
      hr_manager: ["view"],
      operations_manager: [],
      team_lead: [],
      employee: ["view"],
    },
    "leaves.approve": {
      primary_admin: ["approve"],
      secondary_admin: ["approve"],
      hr_manager: ["approve"],
      operations_manager: ["approve"],
      team_lead: ["approve"],
      employee: [],
    },
    "roster.manage": {
      primary_admin: ["manage"],
      secondary_admin: ["manage"],
      hr_manager: [],
      operations_manager: ["manage"],
      team_lead: ["manage"],
      employee: [],
    },
    "reports.generate": {
      primary_admin: ["generate"],
      secondary_admin: ["generate"],
      hr_manager: ["generate"],
      operations_manager: ["generate"],
      team_lead: ["generate"],
      employee: [],
    },
  }

  const key = `${resource}.${action}`
  return actionPermissions[key]?.[userRole]?.includes(action) || false
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(userRole: UserRole): Permission[] {
  const allResources = [
    "companies",
    "admins",
    "subscriptions",
    "employees",
    "hierarchy",
    "attendance",
    "leaves",
    "salary",
    "roster",
    "tasks",
    "reports",
    "announcements",
    "broadcast",
  ]

  return allResources.map((resource) => ({
    resource,
    action: "access",
    allowed: canAccessResource(userRole, resource),
  }))
}

/**
 * Check if user can view team data (for team leads)
 */
export function canViewTeamData(userRole: UserRole): boolean {
  return (
    userRole === "primary_admin" ||
    userRole === "secondary_admin" ||
    userRole === "hr_manager" ||
    userRole === "operations_manager" ||
    userRole === "team_lead"
  )
}

/**
 * Check if user can manage roster
 */
export function canManageRoster(userRole: UserRole): boolean {
  return (
    userRole === "primary_admin" ||
    userRole === "secondary_admin" ||
    userRole === "operations_manager" ||
    userRole === "team_lead"
  )
}

/**
 * Check if user can manage salary
 */
export function canManageSalary(userRole: UserRole): boolean {
  return (
    userRole === "primary_admin" ||
    userRole === "secondary_admin" ||
    userRole === "hr_manager"
  )
}

/**
 * Check if user can generate reports
 */
export function canGenerateReports(userRole: UserRole): boolean {
  return (
    userRole === "primary_admin" ||
    userRole === "secondary_admin" ||
    userRole === "hr_manager" ||
    userRole === "operations_manager" ||
    userRole === "team_lead"
  )
}

/**
 * Check if user can broadcast messages
 */
export function canBroadcast(userRole: UserRole): boolean {
  return (
    userRole === "primary_admin" ||
    userRole === "secondary_admin" ||
    userRole === "hr_manager"
  )
}

