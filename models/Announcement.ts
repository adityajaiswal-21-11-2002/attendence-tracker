import mongoose, { Schema, Document, Model } from "mongoose"

export interface IAnnouncement extends Document {
  _id: mongoose.Types.ObjectId
  companyId: mongoose.Types.ObjectId
  createdBy: mongoose.Types.ObjectId
  title: string
  message: string
  type: string
  targetRoles?: string[]
  isActive: boolean
  createdAt: Date
}

const AnnouncementSchema: Schema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Please provide a company ID"],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Please provide creator ID"],
    },
    title: {
      type: String,
      required: [true, "Please provide a title"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Please provide a message"],
      trim: true,
    },
    type: {
      type: String,
      required: [true, "Please provide an announcement type"],
      trim: true,
    },
    targetRoles: {
      type: [String],
      validate: {
        validator: function (v: string[]) {
          const validRoles = [
            "primary_admin",
            "secondary_admin",
            "hr_manager",
            "operations_manager",
            "team_lead",
            "employee",
          ]
          return v.length === 0 || v.every((role) => validRoles.includes(role))
        },
        message: "Invalid role name",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

// Indexes for efficient queries
AnnouncementSchema.index({ companyId: 1, isActive: 1 })
AnnouncementSchema.index({ createdAt: -1 })

const Announcement: Model<IAnnouncement> =
  mongoose.models.Announcement ||
  mongoose.model<IAnnouncement>("Announcement", AnnouncementSchema)

export default Announcement

