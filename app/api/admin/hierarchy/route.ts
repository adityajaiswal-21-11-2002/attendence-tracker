import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import { z } from "zod"
import mongoose from "mongoose"

const hierarchyUpdateSchema = z.object({
  employeeId: z.string().min(1),
  managerId: z.string().nullable(),
})

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "secondary_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const employees = await User.find({
      companyId: user.companyId,
      role: { $ne: "secondary_admin" },
    })
      .populate("managerId", "name role")
      .select("-password")
      .lean()

    return NextResponse.json({ hierarchy: employees })
  } catch (error) {
    console.error("Error fetching hierarchy:", error)
    return NextResponse.json(
      { error: "Failed to fetch hierarchy" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "secondary_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = hierarchyUpdateSchema.parse(body)

    await connectDB()

    // Verify employee belongs to company
    const employee = await User.findOne({
      _id: validatedData.employeeId,
      companyId: user.companyId,
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Verify manager if provided
    if (validatedData.managerId) {
      const manager = await User.findOne({
        _id: validatedData.managerId,
        companyId: user.companyId,
      })

      if (!manager) {
        return NextResponse.json(
          { error: "Manager not found" },
          { status: 404 }
        )
      }

      // Prevent circular hierarchy
      if (validatedData.employeeId === validatedData.managerId) {
        return NextResponse.json(
          { error: "Employee cannot be their own manager" },
          { status: 400 }
        )
      }
    }

    employee.managerId = validatedData.managerId ? new mongoose.Types.ObjectId(validatedData.managerId) : undefined
    await employee.save()

    return NextResponse.json({ message: "Hierarchy updated successfully" })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating hierarchy:", error)
    return NextResponse.json(
      { error: "Failed to update hierarchy" },
      { status: 500 }
    )
  }
}

