import mongoose, { Schema, Document, Model } from "mongoose"

export interface ITimeTracking {
  startTime?: Date
  pausedDuration?: number // in minutes
  endTime?: Date
  totalDuration?: number // in minutes
}

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId
  title: string
  description?: string
  assignedTo: mongoose.Types.ObjectId
  assignedBy: mongoose.Types.ObjectId
  companyId: mongoose.Types.ObjectId
  date: Date
  status: "not_started" | "in_progress" | "paused" | "completed"
  timeTracking: ITimeTracking
  createdAt: Date
  updatedAt: Date
}

const TimeTrackingSchema: Schema = new Schema(
  {
    startTime: {
      type: Date,
    },
    pausedDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
    endTime: {
      type: Date,
    },
    totalDuration: {
      type: Number,
      min: 0,
    },
  },
  { _id: false }
)

const TaskSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a task title"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Please provide assignee ID"],
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Please provide assigner ID"],
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Please provide a company ID"],
    },
    date: {
      type: Date,
      required: [true, "Please provide a date"],
    },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "paused", "completed"],
      default: "not_started",
    },
    timeTracking: {
      type: TimeTrackingSchema,
      default: {},
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for efficient queries
TaskSchema.index({ assignedTo: 1, date: 1 })
TaskSchema.index({ companyId: 1, date: 1 })
TaskSchema.index({ status: 1 })
TaskSchema.index({ date: 1 })

const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema)

export default Task

