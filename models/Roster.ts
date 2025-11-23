import mongoose, { Schema, Document, Model } from "mongoose"

export interface IRosterTask {
  title: string
  description?: string
  assignedBy: mongoose.Types.ObjectId
  dueDate?: Date
  assignedTo?: mongoose.Types.ObjectId
}

export interface IRoster extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  companyId: mongoose.Types.ObjectId
  date: Date
  shiftType: "morning" | "evening" | "night" | "custom"
  shiftTime: {
    start: string
    end: string
  }
  jobRole: string
  tasks: IRosterTask[]
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const RosterTaskSchema: Schema = new Schema(
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
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dueDate: {
      type: Date,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: false }
)

const RosterSchema: Schema = new Schema(
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
    shiftType: {
      type: String,
      enum: ["morning", "evening", "night", "custom"],
      required: [true, "Please provide a shift type"],
    },
    shiftTime: {
      start: {
        type: String,
        required: true,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"],
      },
      end: {
        type: String,
        required: true,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"],
      },
    },
    jobRole: {
      type: String,
      required: [true, "Please provide a job role"],
      trim: true,
    },
    tasks: {
      type: [RosterTaskSchema],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Please provide creator ID"],
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for efficient queries
RosterSchema.index({ userId: 1, date: 1 }, { unique: true })
RosterSchema.index({ companyId: 1, date: 1 })
RosterSchema.index({ date: 1 })

const Roster: Model<IRoster> =
  mongoose.models.Roster || mongoose.model<IRoster>("Roster", RosterSchema)

export default Roster

