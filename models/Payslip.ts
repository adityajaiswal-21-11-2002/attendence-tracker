import mongoose, { Schema, Document, Model } from "mongoose"

export interface IEarning {
  name: string
  amount: number
  type: "base" | "overtime" | "bonus" | "allowance" | "other"
}

export interface IDeductionItem {
  name: string
  amount: number
  type: "tax" | "insurance" | "loan" | "other"
}

export interface IPayslip extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  companyId: mongoose.Types.ObjectId
  month: number // 1-12
  year: number
  salaryPeriod: {
    startDate: Date
    endDate: Date
  }
  earnings: IEarning[]
  deductions: IDeductionItem[]
  grossPay: number
  totalDeductions: number
  netPay: number
  attendanceSummary: {
    totalDays: number
    presentDays: number
    absentDays: number
    halfDays: number
    leaveDays: number
    totalHours: number
    overtimeHours: number
  }
  status: "draft" | "generated" | "sent" | "paid"
  generatedBy?: mongoose.Types.ObjectId
  generatedAt: Date
  sentAt?: Date
  paidAt?: Date
  createdAt: Date
  updatedAt: Date
}

const EarningSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: ["base", "overtime", "bonus", "allowance", "other"],
      required: true,
    },
  },
  { _id: false }
)

const DeductionItemSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: ["tax", "insurance", "loan", "other"],
      required: true,
    },
  },
  { _id: false }
)

const AttendanceSummarySchema: Schema = new Schema(
  {
    totalDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
  },
  { _id: false }
)

const PayslipSchema: Schema = new Schema(
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
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 3000,
    },
    salaryPeriod: {
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
    },
    earnings: {
      type: [EarningSchema],
      default: [],
    },
    deductions: {
      type: [DeductionItemSchema],
      default: [],
    },
    grossPay: {
      type: Number,
      required: true,
      min: 0,
    },
    totalDeductions: {
      type: Number,
      required: true,
      min: 0,
    },
    netPay: {
      type: Number,
      required: true,
      min: 0,
    },
    attendanceSummary: {
      type: AttendanceSummarySchema,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "generated", "sent", "paid"],
      default: "generated",
    },
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    sentAt: {
      type: Date,
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
PayslipSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true })
PayslipSchema.index({ companyId: 1, month: 1, year: 1 })
PayslipSchema.index({ status: 1 })

const Payslip: Model<IPayslip> =
  mongoose.models.Payslip || mongoose.model<IPayslip>("Payslip", PayslipSchema)

export default Payslip

