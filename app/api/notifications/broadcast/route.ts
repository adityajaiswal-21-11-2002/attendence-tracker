import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Notification from "@/models/Notification"
import User from "@/models/User"
import { z } from "zod"

const broadcastSchema = z.object({
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  type: z.enum(["announcement", "system", "message"]).default("announcement"),
  targetRoles: z.array(z.string()).optional(),
  targetUserIds: z.array(z.string()).optional(),
  sendToAll: z.boolean().default(false),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (
      !user ||
      (user.role !== "primary_admin" &&
        user.role !== "secondary_admin" &&
        user.role !== "hr_manager")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = broadcastSchema.parse(body)

    await connectDB()

    let targetUsers: any[] = []

    if (validatedData.sendToAll) {
      // Send to all employees in the company
      targetUsers = await User.find({
        companyId: user.companyId,
        isActive: true,
      }).select("_id")
    } else if (validatedData.targetUserIds && validatedData.targetUserIds.length > 0) {
      // Send to specific users
      targetUsers = await User.find({
        _id: { $in: validatedData.targetUserIds },
        companyId: user.companyId,
        isActive: true,
      }).select("_id")
    } else if (validatedData.targetRoles && validatedData.targetRoles.length > 0) {
      // Send to specific roles
      targetUsers = await User.find({
        companyId: user.companyId,
        role: { $in: validatedData.targetRoles },
        isActive: true,
      }).select("_id")
    } else {
      return NextResponse.json(
        { error: "Please specify target users, roles, or send to all" },
        { status: 400 }
      )
    }

    if (targetUsers.length === 0) {
      return NextResponse.json(
        { error: "No target users found" },
        { status: 400 }
      )
    }

    // Create notifications for all target users
    const notifications = targetUsers.map((targetUser) => ({
      userId: targetUser._id,
      companyId: user.companyId,
      type: validatedData.type,
      title: validatedData.title,
      message: validatedData.message,
      isRead: false,
    }))

    await Notification.insertMany(notifications)

    return NextResponse.json({
      message: `Notification sent to ${notifications.length} user(s)`,
      count: notifications.length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error broadcasting notification:", error)
    return NextResponse.json(
      { error: "Failed to broadcast notification" },
      { status: 500 }
    )
  }
}

