import { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string
      companyId: string
      role: UserRole
      email: string
      name: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    id: string
    companyId: string
    role: UserRole
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    companyId: string
    role: UserRole
  }
}

export type UserRole =
  | "primary_admin"
  | "secondary_admin"
  | "hr_manager"
  | "operations_manager"
  | "team_lead"
  | "employee"

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  companyName: string
  companyEmail: string
  companyPhone?: string
  companyAddress?: string
  subscriptionPlan: "10_employees" | "50_employees" | "100_employees"
  adminName: string
  adminEmail: string
  adminPassword: string
  confirmPassword: string
}

