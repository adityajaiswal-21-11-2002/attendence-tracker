"use client"

import { useState, useEffect } from "react"
import type { UserRole } from "@/types/auth"
import { canAccessResource, canManageRoster, canManageSalary, canGenerateReports, canBroadcast } from "@/lib/permissions"

interface UsePermissionsReturn {
  canAccess: (resource: string) => boolean
  canManageRoster: () => boolean
  canManageSalary: () => boolean
  canGenerateReports: () => boolean
  canBroadcast: () => boolean
  loading: boolean
}

export function usePermissions(userRole: UserRole | null): UsePermissionsReturn {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(false)
  }, [])

  const canAccess = (resource: string): boolean => {
    if (!userRole) return false
    return canAccessResource(userRole, resource)
  }

  return {
    canAccess,
    canManageRoster: () => (userRole ? canManageRoster(userRole) : false),
    canManageSalary: () => (userRole ? canManageSalary(userRole) : false),
    canGenerateReports: () => (userRole ? canGenerateReports(userRole) : false),
    canBroadcast: () => (userRole ? canBroadcast(userRole) : false),
    loading,
  }
}

