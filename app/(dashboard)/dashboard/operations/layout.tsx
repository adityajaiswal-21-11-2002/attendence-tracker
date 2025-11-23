import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { RoleBasedNavigation } from "@/components/RoleBasedNavigation"
import connectDB from "@/lib/mongodb"
import Company from "@/models/Company"

export default async function OperationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  if (
    user.role !== "operations_manager" &&
    user.role !== "primary_admin" &&
    user.role !== "secondary_admin"
  ) {
    redirect("/dashboard")
  }

  // Get company name
  let companyName: string | undefined
  if (user.companyId) {
    try {
      await connectDB()
      const company = await Company.findById(user.companyId).lean()
      companyName = company?.name
    } catch (error) {
      console.error("Error fetching company:", error)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <RoleBasedNavigation user={user} companyName={companyName} />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  )
}

