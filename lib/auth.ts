import { getServerSession } from "next-auth/next"
import NextAuth, { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import bcrypt from "bcryptjs"
import type { UserRole } from "@/types/auth"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please provide email and password")
        }

        try {
          await connectDB()

          // Find user by email and include password
          const user = await User.findOne({ email: credentials.email })
            .select("+password")
            .exec()

          if (!user) {
            throw new Error("Invalid email or password")
          }

          const userObj = user.toObject()

          // Check if user is active
          if (!userObj.isActive) {
            throw new Error("Your account has been deactivated")
          }

          // Verify password
          const isPasswordValid = await verifyPassword(
            credentials.password,
            userObj.password
          )

          if (!isPasswordValid) {
            throw new Error("Invalid email or password")
          }

          // Return user object (password will not be included in token)
          return {
            id: userObj._id.toString(),
            email: userObj.email,
            name: userObj.name,
            companyId: userObj.companyId.toString(),
            role: userObj.role,
          }
        } catch (error) {
          console.error("Auth error:", error)
          throw error
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.companyId = user.companyId
        token.role = user.role
        token.email = user.email
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.companyId = token.companyId as string
        session.user.role = token.role as UserRole
        session.user.email = token.email as string
        session.user.name = token.name as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

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

