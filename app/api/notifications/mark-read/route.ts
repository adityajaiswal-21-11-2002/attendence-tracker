import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Notification from "@/models/Notification"

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, markAll } = body

    await connectDB()

    if (markAll) {
      // Mark all notifications as read
      await Notification.updateMany(
        {
          userId: user.id,
          companyId: user.companyId,
          isRead: false,
        },
        {
          $set: { isRead: true },
        }
      )

      return NextResponse.json({
        message: "All notifications marked as read",
      })
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      )
    }

    // Mark single notification as read
    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        userId: user.id,
        companyId: user.companyId,
      },
      {
        $set: { isRead: true },
      },
      { new: true }
    )

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: "Notification marked as read",
      notification: {
        _id: notification._id,
        isRead: notification.isRead,
      },
    })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    )
  }
}

