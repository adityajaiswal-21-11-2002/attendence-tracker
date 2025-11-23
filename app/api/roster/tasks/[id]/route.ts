import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Roster from "@/models/Roster"
import { z } from "zod"

const taskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  taskIndex: z.number().optional(),
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
    const validatedData = taskUpdateSchema.parse(body)

    await connectDB()

    const roster = await Roster.findOne({
      _id: params.id,
      companyId: user.companyId,
    })

    if (!roster) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 })
    }

    // Find task by index or update all tasks
    if (validatedData.taskIndex !== undefined) {
      const taskIndex = validatedData.taskIndex
      if (taskIndex >= 0 && taskIndex < roster.tasks.length) {
        if (validatedData.title) {
          roster.tasks[taskIndex].title = validatedData.title
        }
        if (validatedData.description !== undefined) {
          roster.tasks[taskIndex].description = validatedData.description
        }
      }
    }

    await roster.save()

    return NextResponse.json({ roster })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error updating task:", error)
    return NextResponse.json(
      { error: "Failed to update task" },
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
      (user.role !== "operations_manager" && user.role !== "team_lead")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const taskIndex = body.taskIndex

    if (taskIndex === undefined) {
      return NextResponse.json(
        { error: "Task index is required" },
        { status: 400 }
      )
    }

    await connectDB()

    const roster = await Roster.findOne({
      _id: params.id,
      companyId: user.companyId,
    })

    if (!roster) {
      return NextResponse.json({ error: "Roster not found" }, { status: 404 })
    }

    if (taskIndex >= 0 && taskIndex < roster.tasks.length) {
      roster.tasks.splice(taskIndex, 1)
      await roster.save()
    }

    return NextResponse.json({ message: "Task deleted successfully" })
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    )
  }
}

