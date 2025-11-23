import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Notification from "@/models/Notification"
import User from "@/models/User"
import { z } from "zod"

const sendIndividualSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  type: z.enum(["message", "system"]).default("message"),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only managers and admins can send individual messages
    const canSend =
      user.role === "primary_admin" ||
      user.role === "secondary_admin" ||
      user.role === "hr_manager" ||
      user.role === "operations_manager" ||
      user.role === "team_lead"

    if (!canSend) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = sendIndividualSchema.parse(body)

    await connectDB()

    // Verify target user belongs to same company
    const targetUser = await User.findById(validatedData.userId)
    if (!targetUser || targetUser.companyId.toString() !== user.companyId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // For team leads, verify they can message this user (must be their team member)
    if (user.role === "team_lead") {
      if (targetUser.managerId?.toString() !== user.id) {
        return NextResponse.json(
          { error: "You can only message your team members" },
          { status: 403 }
        )
      }
    }

    // Create notification
    const notification = await Notification.create({
      userId: validatedData.userId,
      companyId: user.companyId,
      type: validatedData.type,
      title: validatedData.title,
      message: validatedData.message,
      isRead: false,
    })

    return NextResponse.json({
      message: "Notification sent successfully",
      notification: {
        _id: notification._id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error sending individual notification:", error)
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    )
  }
}

