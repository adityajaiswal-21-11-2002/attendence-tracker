import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getRedirectPath } from "@/lib/auth"

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  // Redirect to role-specific dashboard
  const redirectPath = getRedirectPath(user.role)
  redirect(redirectPath)
}

