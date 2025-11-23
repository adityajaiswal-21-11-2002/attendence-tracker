import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Announcement from "@/models/Announcement"
import { z } from "zod"

const announcementSchema = z.object({
  title: z.string().min(1).optional(),
  message: z.string().min(1).optional(),
  type: z.string().optional(),
  companyId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "primary_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = announcementSchema.parse(body)

    await connectDB()

    const announcement = await Announcement.findById(params.id)

    if (!announcement) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 }
      )
    }

    Object.assign(announcement, validatedData)
    await announcement.save()

    return NextResponse.json({ announcement })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating announcement:", error)
    return NextResponse.json(
      { error: "Failed to update announcement" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "primary_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const announcement = await Announcement.findByIdAndDelete(params.id)

    if (!announcement) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: "Announcement deleted successfully" })
  } catch (error) {
    console.error("Error deleting announcement:", error)
    return NextResponse.json(
      { error: "Failed to delete announcement" },
      { status: 500 }
    )
  }
}

