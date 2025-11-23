import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Notification from "@/models/Notification"

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const notification = await Notification.findOneAndDelete({
      _id: params.id,
      userId: user.id,
      companyId: user.companyId,
    })

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: "Notification deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting notification:", error)
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    )
  }
}

