import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Announcement from "@/models/Announcement"
import { z } from "zod"

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  type: z.string().optional(),
  companyId: z.string().optional(),
})

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || (user.role !== "primary_admin" && user.role !== "secondary_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const announcements = await Announcement.find()
      .populate("companyId", "name")
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ announcements })
  } catch (error) {
    console.error("Error fetching announcements:", error)
    return NextResponse.json(
      { error: "Failed to fetch announcements" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "primary_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = announcementSchema.parse(body)

    await connectDB()

    const announcement = await Announcement.create({
      ...validatedData,
      companyId: validatedData.companyId || null,
      createdBy: user.id,
      isActive: true,
    })

    return NextResponse.json({ announcement }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating announcement:", error)
    return NextResponse.json(
      { error: "Failed to create announcement" },
      { status: 500 }
    )
  }
}

