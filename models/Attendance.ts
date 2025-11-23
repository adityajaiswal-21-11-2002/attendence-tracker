import mongoose, { Schema, Document, Model } from "mongoose"

export interface IBreak {
  breakIn: Date
  breakOut?: Date
}

export interface ITaskTime {
  taskId: mongoose.Types.ObjectId
  startTime: Date
  pauseTime?: Date
  endTime?: Date
  duration?: number // in minutes
}

export interface IAttendance extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  companyId: mongoose.Types.ObjectId
  date: Date
  loginTime?: Date
  logoutTime?: Date
  breaks: IBreak[]
  totalHours?: number
  status: "present" | "absent" | "half_day" | "holiday" | "leave"
  tasks: ITaskTime[]
  createdAt: Date
  updatedAt: Date
}

const BreakSchema: Schema = new Schema(
  {
    breakIn: {
      type: Date,
      required: true,
    },
    breakOut: {
      type: Date,
    },
  },
  { _id: false }
)

const TaskTimeSchema: Schema = new Schema(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    pauseTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number,
      min: 0,
    },
  },
  { _id: false }
)

const AttendanceSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Please provide a user ID"],
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
    loginTime: {
      type: Date,
    },
    logoutTime: {
      type: Date,
    },
    breaks: {
      type: [BreakSchema],
      default: [],
    },
    totalHours: {
      type: Number,
      min: 0,
      max: 24,
    },
    status: {
      type: String,
      enum: ["present", "absent", "half_day", "holiday", "leave"],
      default: "absent",
    },
    tasks: {
      type: [TaskTimeSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for efficient queries
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true })
AttendanceSchema.index({ companyId: 1, date: 1 })
AttendanceSchema.index({ date: 1 })

const Attendance: Model<IAttendance> =
  mongoose.models.Attendance ||
  mongoose.model<IAttendance>("Attendance", AttendanceSchema)

export default Attendance

