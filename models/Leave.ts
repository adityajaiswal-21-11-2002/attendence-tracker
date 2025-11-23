import mongoose, { Schema, Document, Model } from "mongoose"

export interface ILeave extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  companyId: mongoose.Types.ObjectId
  leaveType: "earned" | "sick" | "comp_off" | "casual"
  fromDate: Date
  toDate: Date
  numberOfDays: number
  reason: string
  status: "pending" | "approved" | "rejected"
  approvedBy?: mongoose.Types.ObjectId
  comments?: string
  createdAt: Date
  updatedAt: Date
}

const LeaveSchema: Schema = new Schema(
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
    leaveType: {
      type: String,
      enum: ["earned", "sick", "comp_off", "casual"],
      required: [true, "Please provide a leave type"],
    },
    fromDate: {
      type: Date,
      required: [true, "Please provide a from date"],
    },
    toDate: {
      type: Date,
      required: [true, "Please provide a to date"],
      validate: {
        validator: function (this: ILeave, value: Date) {
          return value >= this.fromDate
        },
        message: "To date must be greater than or equal to from date",
      },
    },
    numberOfDays: {
      type: Number,
      required: true,
      min: 0.5,
      validate: {
        validator: function (this: ILeave, value: number) {
          const diffTime = Math.abs(
            this.toDate.getTime() - this.fromDate.getTime()
          )
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
          return value <= diffDays
        },
        message: "Number of days cannot exceed the date range",
      },
    },
    reason: {
      type: String,
      required: [true, "Please provide a reason"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    comments: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for efficient queries
LeaveSchema.index({ userId: 1, fromDate: 1, toDate: 1 })
LeaveSchema.index({ companyId: 1, status: 1 })
LeaveSchema.index({ status: 1 })

const Leave: Model<ILeave> =
  mongoose.models.Leave || mongoose.model<ILeave>("Leave", LeaveSchema)

export default Leave

