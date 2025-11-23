import mongoose, { Schema, Document, Model } from "mongoose"

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId
  email: string
  password: string
  name: string
  phone?: string
  role:
    | "primary_admin"
    | "secondary_admin"
    | "hr_manager"
    | "operations_manager"
    | "team_lead"
    | "employee"
  companyId: mongoose.Types.ObjectId
  managerId?: mongoose.Types.ObjectId
  salary: {
    type: "fixed" | "hourly" | "commission"
    amount: number
    currency: string
  }
  shiftTime: {
    start: string
    end: string
  }
  offDays: string[]
  jobRole: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 6,
      select: false, // Don't return password by default
    },
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: [
        "primary_admin",
        "secondary_admin",
        "hr_manager",
        "operations_manager",
        "team_lead",
        "employee",
      ],
      default: "employee",
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Please provide a company ID"],
    },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    salary: {
      type: {
        type: String,
        enum: ["fixed", "hourly", "commission"],
        required: true,
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      currency: {
        type: String,
        default: "INR",
        uppercase: true,
      },
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
    offDays: {
      type: [String],
      default: ["Saturday", "Sunday"],
      validate: {
        validator: function (v: string[]) {
          const validDays = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ]
          return v.every((day) => validDays.includes(day))
        },
        message: "Invalid day name",
      },
    },
    jobRole: {
      type: String,
      required: [true, "Please provide a job role"],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for efficient queries
UserSchema.index({ email: 1 })
UserSchema.index({ companyId: 1 })
UserSchema.index({ managerId: 1 })
UserSchema.index({ role: 1 })

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema)

export default User

