import { getCurrentUser } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { UserRole } from "@/types/auth"
import {
  canAccessResource,
  canManageRoster,
  canManageSalary,
  canGenerateReports,
  canBroadcast,
} from "@/lib/permissions"

/**
 * Check if user has permission to access a resource
 * Returns NextResponse with error if unauthorized, null if authorized
 */
export async function checkResourcePermission(
  resource: string
): Promise<NextResponse | null> {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!canAccessResource(user.role, resource)) {
    return NextResponse.json(
      { error: "You don't have permission to access this resource" },
      { status: 403 }
    )
  }

  return null
}

/**
 * Check if user can manage roster
 */
export async function checkRosterPermission(): Promise<NextResponse | null> {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!canManageRoster(user.role)) {
    return NextResponse.json(
      { error: "You don't have permission to manage rosters" },
      { status: 403 }
    )
  }

  return null
}

/**
 * Check if user can manage salary
 */
export async function checkSalaryPermission(): Promise<NextResponse | null> {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!canManageSalary(user.role)) {
    return NextResponse.json(
      { error: "You don't have permission to manage salary" },
      { status: 403 }
    )
  }

  return null
}

/**
 * Check if user can generate reports
 */
export async function checkReportsPermission(): Promise<NextResponse | null> {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!canGenerateReports(user.role)) {
    return NextResponse.json(
      { error: "You don't have permission to generate reports" },
      { status: 403 }
    )
  }

  return null
}

/**
 * Check if user can broadcast messages
 */
export async function checkBroadcastPermission(): Promise<NextResponse | null> {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!canBroadcast(user.role)) {
    return NextResponse.json(
      { error: "You don't have permission to broadcast messages" },
      { status: 403 }
    )
  }

  return null
}

/**
 * Get current user with role check
 */
export async function getAuthorizedUser(
  allowedRoles: UserRole[]
): Promise<{ user: any; error: NextResponse | null }> {
  const user = await getCurrentUser()

  if (!user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  if (!allowedRoles.includes(user.role)) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "You don't have permission to access this resource" },
        { status: 403 }
      ),
    }
  }

  return { user, error: null }
}

