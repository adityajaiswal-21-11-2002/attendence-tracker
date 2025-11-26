import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import { hashPassword } from "@/lib/auth"
import { z } from "zod"

const employeeUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["hr_manager", "operations_manager", "team_lead", "employee"]).optional(),
  jobRole: z.string().min(1).optional(),
  managerId: z.string().nullable().optional(),
  salary: z
    .object({
      type: z.enum(["fixed", "hourly", "commission"]),
      amount: z.number().min(0),
      currency: z.string().default("INR"),
    })
    .optional(),
  shiftTime: z
    .object({
      start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    })
    .optional(),
  offDays: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (
      !user ||
      (user.role !== "secondary_admin" && user.role !== "hr_manager" && user.role !== "primary_admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = employeeUpdateSchema.parse(body)

    await connectDB()

    const employee = await User.findOne({
      _id: params.id,
      companyId: user.companyId,
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Verify manager belongs to same company
    if (validatedData.managerId !== undefined) {
      if (validatedData.managerId) {
        const manager = await User.findOne({
          _id: validatedData.managerId,
          companyId: user.companyId,
        })
        if (!manager) {
          return NextResponse.json(
            { error: "Invalid manager selected" },
            { status: 400 }
          )
        }
      }
    }

    // Hash password if provided
    if (validatedData.password) {
      validatedData.password = await hashPassword(validatedData.password)
    }

    Object.assign(employee, validatedData)
    await employee.save()

    const employeeObj = employee.toObject()
    delete (employeeObj as any).password

    return NextResponse.json({ employee: employeeObj })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating employee:", error)
    return NextResponse.json(
      { error: "Failed to update employee" },
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

    if (
      !user ||
      (user.role !== "secondary_admin" && user.role !== "hr_manager" && user.role !== "primary_admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const employee = await User.findOneAndDelete({
      _id: params.id,
      companyId: user.companyId,
      role: { $ne: "secondary_admin" },
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Employee deleted successfully" })
  } catch (error) {
    console.error("Error deleting employee:", error)
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    )
  }
}

