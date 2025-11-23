import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import bcrypt from "bcryptjs"
import type { UserRole } from "@/types/auth"

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * Check if user has a specific role
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    primary_admin: 6,
    secondary_admin: 5,
    hr_manager: 4,
    operations_manager: 4,
    team_lead: 3,
    employee: 1,
  }

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

/**
 * Check if user is admin (primary or secondary)
 */
export function isAdmin(role: UserRole): boolean {
  return role === "primary_admin" || role === "secondary_admin"
}

/**
 * Check if user is manager (HR, Operations, or Team Lead)
 */
export function isManager(role: UserRole): boolean {
  return (
    role === "hr_manager" ||
    role === "operations_manager" ||
    role === "team_lead"
  )
}

/**
 * Check if user can manage other users
 */
export function canManageUsers(role: UserRole): boolean {
  return (
    role === "primary_admin" ||
    role === "secondary_admin" ||
    role === "hr_manager"
  )
}

/**
 * Check if user can approve leaves
 */
export function canApproveLeaves(role: UserRole): boolean {
  return (
    role === "primary_admin" ||
    role === "secondary_admin" ||
    role === "hr_manager" ||
    role === "operations_manager" ||
    role === "team_lead"
  )
}

/**
 * Check if user can view all attendance
 */
export function canViewAllAttendance(role: UserRole): boolean {
  return (
    role === "primary_admin" ||
    role === "secondary_admin" ||
    role === "hr_manager" ||
    role === "operations_manager" ||
    role === "team_lead"
  )
}

/**
 * Get redirect path based on user role
 */
export function getRedirectPath(role: UserRole): string {
  switch (role) {
    case "primary_admin":
    case "secondary_admin":
      return "/dashboard/admin"
    case "hr_manager":
      return "/dashboard/hr"
    case "operations_manager":
      return "/dashboard/operations"
    case "team_lead":
      return "/dashboard/team-lead"
    case "employee":
      return "/dashboard/employee"
    default:
      return "/dashboard"
  }
}

