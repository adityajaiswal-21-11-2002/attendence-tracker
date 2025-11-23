import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Roster from "@/models/Roster"
import { z } from "zod"

const rosterUpdateSchema = z.object({
  userId: z.string().min(1).optional(),
  date: z.string().datetime().optional(),
  shiftType: z.enum(["morning", "evening", "night", "custom"]).optional(),
  shiftTime: z
    .object({
      start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    })
    .optional(),
  jobRole: z.string().min(1).optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (
      !user ||
      (user.role !== "operations_manager" && user.role !== "team_lead")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = rosterUpdateSchema.parse(body)

    await connectDB()

    const roster = await Roster.findOne({
      _id: params.id,
      companyId: user.companyId,
    })

    if (!roster) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 })
    }

    Object.assign(roster, validatedData)
    await roster.save()

    return NextResponse.json({ roster })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating roster:", error)
    return NextResponse.json(
      { error: "Failed to update roster" },
      { status: 500 }
    )
  }
}

