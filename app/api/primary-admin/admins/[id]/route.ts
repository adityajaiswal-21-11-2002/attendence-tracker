import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import { hashPassword } from "@/lib/auth"
import { z } from "zod"

const adminSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  companyId: z.string().optional(),
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
    const validatedData = adminSchema.parse(body)

    await connectDB()

    const admin = await User.findById(params.id)

    if (!admin || admin.role !== "secondary_admin") {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 })
    }

    // Hash password if provided
    if (validatedData.password) {
      validatedData.password = await hashPassword(validatedData.password)
    }

    Object.assign(admin, validatedData)
    await admin.save()

    const adminObj = admin.toObject()
    // Remove sensitive password field
    const { password, ...adminWithoutPassword } = adminObj

    return NextResponse.json({ admin: adminObj })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating admin:", error)
    return NextResponse.json(
      { error: "Failed to update admin" },
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

    const admin = await User.findByIdAndDelete(params.id)

    if (!admin || admin.role !== "secondary_admin") {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Admin deleted successfully" })
  } catch (error) {
    console.error("Error deleting admin:", error)
    return NextResponse.json(
      { error: "Failed to delete admin" },
      { status: 500 }
    )
  }
}

