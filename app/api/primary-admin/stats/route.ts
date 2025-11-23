import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Company from "@/models/Company"
import User from "@/models/User"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== "primary_admin" && user.role !== "secondary_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // Get total companies
    const totalCompanies = await Company.countDocuments()

    // Get active subscriptions
    const activeSubscriptions = await Company.countDocuments({
      isActive: true,
      subscriptionExpiry: { $gte: new Date() },
    })

    // Calculate total revenue
    const companies = await Company.find({ isActive: true }).lean()
    const totalRevenue = companies.reduce(
      (sum, company) => sum + (company.subscriptionPrice || 0),
      0
    )

    // Get total admins
    const totalAdmins = await User.countDocuments({
      role: { $in: ["primary_admin", "secondary_admin"] },
    })

    // Get recent activities (last 5 companies created)
    const recentCompanies = await Company.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name createdAt")
      .lean()

    const recentActivities = recentCompanies.map((company: any) => {
      const date = new Date(company.createdAt)
      const time = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      return {
        title: "New Company Created",
        description: `${company.name} was added to the system`,
        time,
      }
    })

    return NextResponse.json({
      totalCompanies,
      activeSubscriptions,
      totalRevenue,
      totalAdmins,
      recentActivities,
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    )
  }
}

