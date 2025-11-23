import mongoose, { Schema, Document, Model } from "mongoose"

export interface ILeaveBalance extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  companyId: mongoose.Types.ObjectId
  year: number
  earnedLeave: number
  sickLeave: number
  compOff: number
  casualLeave: number
  updatedAt: Date
}

const LeaveBalanceSchema: Schema = new Schema(
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
    year: {
      type: Number,
      required: [true, "Please provide a year"],
      min: 2000,
      max: 3000,
    },
    earnedLeave: {
      type: Number,
      default: 0,
      min: 0,
    },
    sickLeave: {
      type: Number,
      default: 0,
      min: 0,
    },
    compOff: {
      type: Number,
      default: 0,
      min: 0,
    },
    casualLeave: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
)

// Indexes for efficient queries - unique combination of userId, companyId, and year
LeaveBalanceSchema.index({ userId: 1, companyId: 1, year: 1 }, { unique: true })
LeaveBalanceSchema.index({ companyId: 1, year: 1 })

const LeaveBalance: Model<ILeaveBalance> =
  mongoose.models.LeaveBalance ||
  mongoose.model<ILeaveBalance>("LeaveBalance", LeaveBalanceSchema)

export default LeaveBalance

