import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Attendance from "@/models/Attendance"
import Task from "@/models/Task"
import { z } from "zod"
import { startOfDay, endOfDay } from "date-fns"

const taskTimerSchema = z.object({
  taskId: z.string().min(1),
  action: z.enum(["start", "pause", "complete"]),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = taskTimerSchema.parse(body)

    await connectDB()

    // Get task
    const task = await Task.findOne({
      _id: validatedData.taskId,
      assignedTo: user.id,
      companyId: user.companyId,
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Get today's attendance
    const today = new Date()
    const dayStart = startOfDay(today)
    const dayEnd = endOfDay(today)

    let attendance = await Attendance.findOne({
      userId: user.id,
      companyId: user.companyId,
      date: {
        $gte: dayStart,
        $lte: dayEnd,
      },
    })

    if (!attendance) {
      return NextResponse.json(
        { error: "Must be logged in to track tasks" },
        { status: 400 }
      )
    }

    // Find or create task time entry
    let taskTime = attendance.tasks.find(
      (t) => t.taskId.toString() === validatedData.taskId
    )

    if (!taskTime) {
      taskTime = {
        taskId: task._id,
        startTime: new Date(),
        duration: 0,
      }
      attendance.tasks.push(taskTime)
    }

    if (validatedData.action === "start") {
      if (taskTime.startTime && !taskTime.endTime) {
        return NextResponse.json(
          { error: "Task already started" },
          { status: 400 }
        )
      }
      taskTime.startTime = new Date()
      taskTime.pauseTime = undefined
      taskTime.endTime = undefined
      task.status = "in_progress"
    } else if (validatedData.action === "pause") {
      if (!taskTime.startTime || taskTime.endTime) {
        return NextResponse.json(
          { error: "Task not started or already completed" },
          { status: 400 }
        )
      }
      const now = new Date()
      const pausedAt = taskTime.pauseTime || taskTime.startTime
      const pauseDuration = taskTime.pausedDuration || 0
      const newPauseDuration =
        pauseDuration +
        Math.floor((now.getTime() - pausedAt.getTime()) / (1000 * 60))
      taskTime.pauseTime = now
      taskTime.pausedDuration = newPauseDuration
      task.status = "paused"
    } else if (validatedData.action === "complete") {
      if (!taskTime.startTime) {
        return NextResponse.json(
          { error: "Task not started" },
          { status: 400 }
        )
      }
      const now = new Date()
      const totalMinutes =
        Math.floor((now.getTime() - taskTime.startTime.getTime()) / (1000 * 60)) -
        (taskTime.pausedDuration || 0)
      taskTime.endTime = now
      taskTime.duration = totalMinutes
      task.status = "completed"
      task.timeTracking = {
        startTime: taskTime.startTime,
        pausedDuration: taskTime.pausedDuration || 0,
        endTime: now,
        totalDuration: totalMinutes,
      }
    }

    await attendance.save()
    await task.save()

    return NextResponse.json({ attendance, task })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error managing task timer:", error)
    return NextResponse.json(
      { error: "Failed to manage task timer" },
      { status: 500 }
    )
  }
}

