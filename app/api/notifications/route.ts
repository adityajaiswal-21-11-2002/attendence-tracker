import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Notification from "@/models/Notification"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 50
    const type = searchParams.get("type")
    const isRead = searchParams.get("isRead")

    let query: any = {
      userId: user.id,
      companyId: user.companyId,
    }

    if (type) {
      query.type = type
    }

    if (isRead !== null && isRead !== undefined) {
      query.isRead = isRead === "true"
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)

    const unreadCount = await Notification.countDocuments({
      userId: user.id,
      companyId: user.companyId,
      isRead: false,
    })

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        _id: n._id,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      unreadCount,
    })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    )
  }
}

