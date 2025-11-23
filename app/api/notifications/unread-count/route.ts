import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Notification from "@/models/Notification"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const unreadCount = await Notification.countDocuments({
      userId: user.id,
      companyId: user.companyId,
      isRead: false,
    })

    return NextResponse.json({ unreadCount })
  } catch (error) {
    console.error("Error fetching unread count:", error)
    return NextResponse.json(
      { error: "Failed to fetch unread count" },
      { status: 500 }
    )
  }
}

