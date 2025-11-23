import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // For API routes without token, return 401 JSON instead of redirecting
    if (path.startsWith("/api/") && !token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // If no token for non-API routes, redirect to login
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // Role-based route protection
    const role = token.role as string

    // Admin routes - allow HR managers to access employees, hierarchy, and broadcast pages
    if (path.startsWith("/dashboard/admin")) {
      // Allow HR managers to access employees, hierarchy, and broadcast management
      if (
        path.startsWith("/dashboard/admin/employees") ||
        path.startsWith("/dashboard/admin/hierarchy") ||
        path.startsWith("/dashboard/admin/broadcast")
      ) {
        if (
          role !== "primary_admin" &&
          role !== "secondary_admin" &&
          role !== "hr_manager"
        ) {
          return NextResponse.redirect(new URL("/dashboard", req.url))
        }
      } else {
        // Other admin routes are only for admins
        if (role !== "primary_admin" && role !== "secondary_admin") {
          return NextResponse.redirect(new URL("/dashboard", req.url))
        }
      }
    }

    // HR routes - only for hr_manager and admins
    if (path.startsWith("/dashboard/hr")) {
      if (
        role !== "primary_admin" &&
        role !== "secondary_admin" &&
        role !== "hr_manager"
      ) {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
    }

    // Operations routes - only for operations_manager and admins
    if (path.startsWith("/dashboard/operations")) {
      if (
        role !== "primary_admin" &&
        role !== "secondary_admin" &&
        role !== "operations_manager"
      ) {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
    }

    // Team Lead routes - only for team_lead and above
    if (path.startsWith("/dashboard/team-lead")) {
      if (
        role !== "primary_admin" &&
        role !== "secondary_admin" &&
        role !== "hr_manager" &&
        role !== "operations_manager" &&
        role !== "team_lead"
      ) {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
    }

    // Employee routes - accessible to all authenticated users
    // The page itself will handle role-based redirects if needed
    if (path.startsWith("/dashboard/employee")) {
      // All authenticated users can access (page will redirect non-employees)
      return NextResponse.next()
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        
        // Allow access to auth pages without token
        if (path.startsWith("/login") || 
            path.startsWith("/register") ||
            path.startsWith("/forgot-password") ||
            path.startsWith("/api/auth")) {
          return true
        }

        // For API routes, allow through so middleware function can return 401 JSON
        // (instead of redirecting)
        if (path.startsWith("/api/")) {
          return true // Let middleware function handle the 401 response
        }

        // Require token for all other routes (dashboard pages)
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/primary-admin/:path*",
    "/api/secondary-admin/:path*",
    "/api/roster/:path*",
    "/api/admin/:path*",
    "/api/attendance/:path*",
  ],
}

