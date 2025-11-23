import NextAuth, { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import { verifyPassword } from "@/lib/auth"
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

const handler = NextAuth(authOptions)

export const GET = handler
export const POST = handler

