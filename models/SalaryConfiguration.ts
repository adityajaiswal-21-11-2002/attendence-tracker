import mongoose, { Schema, Document, Model } from "mongoose"

export interface IDeduction {
  name: string
  type: "fixed" | "percentage" // fixed amount or percentage of base
  amount: number
  isActive: boolean
}

export interface ISalaryConfiguration extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  companyId: mongoose.Types.ObjectId
  salaryType: "fixed" | "hourly" | "commission"
  baseAmount: number
  currency: string
  deductions: IDeduction[]
  overtimeEnabled: boolean
  overtimeRate?: number // multiplier for overtime (e.g., 1.5 for 1.5x)
  standardHoursPerDay?: number // for hourly employees
  standardDaysPerMonth?: number // for fixed salary employees
  createdAt: Date
  updatedAt: Date
}

const DeductionSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["fixed", "percentage"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
)

const SalaryConfigurationSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Please provide a user ID"],
      unique: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Please provide a company ID"],
    },
    salaryType: {
      type: String,
      enum: ["fixed", "hourly", "commission"],
      required: [true, "Please provide a salary type"],
    },
    baseAmount: {
      type: Number,
      required: [true, "Please provide a base amount"],
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },
    deductions: {
      type: [DeductionSchema],
      default: [],
    },
    overtimeEnabled: {
      type: Boolean,
      default: false,
    },
    overtimeRate: {
      type: Number,
      default: 1.5,
      min: 1,
    },
    standardHoursPerDay: {
      type: Number,
      default: 8,
      min: 1,
      max: 24,
    },
    standardDaysPerMonth: {
      type: Number,
      default: 22,
      min: 1,
      max: 31,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
SalaryConfigurationSchema.index({ userId: 1 }, { unique: true })
SalaryConfigurationSchema.index({ companyId: 1 })

const SalaryConfiguration: Model<ISalaryConfiguration> =
  mongoose.models.SalaryConfiguration ||
  mongoose.model<ISalaryConfiguration>("SalaryConfiguration", SalaryConfigurationSchema)

export default SalaryConfiguration

