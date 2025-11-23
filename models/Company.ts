import mongoose, { Schema, Document, Model } from "mongoose"

export interface ICompany extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  email: string
  phone?: string
  address?: string
  subscriptionPlan: "10_employees" | "50_employees" | "100_employees"
  subscriptionPrice: number
  subscriptionExpiry: Date
  isActive: boolean
  createdBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const CompanySchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a company name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    subscriptionPlan: {
      type: String,
      enum: ["10_employees", "50_employees", "100_employees"],
      required: true,
      default: "10_employees",
    },
    subscriptionPrice: {
      type: Number,
      required: true,
      enum: [4000, 10000, 20000],
      validate: {
        validator: function (this: ICompany, value: number) {
          const planPrices: Record<string, number> = {
            "10_employees": 4000,
            "50_employees": 10000,
            "100_employees": 20000,
          }
          return value === planPrices[this.subscriptionPlan]
        },
        message: "Subscription price must match the plan",
      },
    },
    subscriptionExpiry: {
      type: Date,
      required: [true, "Please provide subscription expiry date"],
    },
    isActive: {
      type: Boolean,
      default: true,
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
CompanySchema.index({ email: 1 })
CompanySchema.index({ isActive: 1 })
CompanySchema.index({ subscriptionExpiry: 1 })

const Company: Model<ICompany> =
  mongoose.models.Company || mongoose.model<ICompany>("Company", CompanySchema)

export default Company

