import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Roster from "@/models/Roster"
import { z } from "zod"

const taskSchema = z.object({
  rosterId: z.string().optional(),
  userId: z.string().optional(),
  date: z.string().optional(),
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
}).refine(
  (data) => data.rosterId || (data.userId && data.date),
  { message: "Either rosterId or userId with date is required" }
)

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (
      !user ||
      (user.role !== "operations_manager" && user.role !== "team_lead")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // Get all rosters with tasks for the company
    const rosters = await Roster.find({
      companyId: user.companyId,
      tasks: { $exists: true, $ne: [] },
    })
      .populate("userId", "name email")
      .populate("createdBy", "name")
      .sort({ date: -1 })
      .lean()

    // Extract all tasks from rosters
    const allTasks: any[] = []
    rosters.forEach((roster: any) => {
      if (roster.tasks && roster.tasks.length > 0) {
        roster.tasks.forEach((task: any, index: number) => {
          allTasks.push({
            _id: `${roster._id}-${index}`,
            rosterId: roster._id,
            rosterDate: roster.date,
            employeeName: roster.userId?.name || "Unknown",
            employeeId: roster.userId?._id || roster.userId,
            title: task.title,
            description: task.description || "",
            assignedBy: task.assignedBy?.name || "Unknown",
            dueDate: task.dueDate,
            assignedTo: task.assignedTo,
            createdAt: roster.createdAt,
          })
        })
      }
    })

    return NextResponse.json({ tasks: allTasks })
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (
      !user ||
      (user.role !== "operations_manager" && user.role !== "team_lead")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = taskSchema.parse(body)

    await connectDB()

    let roster

    // Find or create roster based on rosterId or userId+date
    if (validatedData.rosterId) {
      roster = await Roster.findOne({
        _id: validatedData.rosterId,
        companyId: user.companyId,
      })

      if (!roster) {
        return NextResponse.json({ error: "Roster not found" }, { status: 404 })
      }
    } else if (validatedData.userId && validatedData.date) {
      // Find existing roster or create a new one
      const taskDate = new Date(validatedData.date)
      // Set to start of day for proper date comparison
      taskDate.setHours(0, 0, 0, 0)
      
      const startOfDay = new Date(taskDate)
      const endOfDay = new Date(taskDate)
      endOfDay.setHours(23, 59, 59, 999)
      
      roster = await Roster.findOne({
        userId: validatedData.userId,
        date: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
        companyId: user.companyId,
      })

      if (!roster) {
        // Get employee to create roster
        const User = (await import("@/models/User")).default
        const employee = await User.findOne({
          _id: validatedData.userId,
          companyId: user.companyId,
        })

        if (!employee) {
          return NextResponse.json({ error: "Employee not found" }, { status: 404 })
        }

        // Create a basic roster for the task
        roster = await Roster.create({
          userId: validatedData.userId,
          companyId: user.companyId,
          date: taskDate,
          shiftType: "custom",
          shiftTime: {
            start: "09:00",
            end: "18:00",
          },
          jobRole: employee.jobRole,
          tasks: [],
          createdBy: user.id,
        })
      }
    } else {
      return NextResponse.json(
        { error: "Either rosterId or userId with date is required" },
        { status: 400 }
      )
    }

    // Add task to roster
    const taskData: any = {
      title: validatedData.title,
      description: validatedData.description,
      assignedBy: user.id,
    }

    if (validatedData.dueDate) {
      taskData.dueDate = new Date(validatedData.dueDate)
    }

    // Set assignedTo - use userId from request, or roster's userId if not provided
    if (validatedData.userId) {
      taskData.assignedTo = validatedData.userId
    } else if (roster.userId) {
      taskData.assignedTo = roster.userId
    }

    roster.tasks.push(taskData)

    await roster.save()

    return NextResponse.json({ roster }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error creating task:", error)
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    )
  }
}

