import mongoose, { Schema, Document, Model } from "mongoose"

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  companyId: mongoose.Types.ObjectId
  type: "leave_approval" | "announcement" | "system" | "message"
  title: string
  message: string
  isRead: boolean
  createdAt: Date
}

const NotificationSchema: Schema = new Schema(
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
    type: {
      type: String,
      enum: ["leave_approval", "announcement", "system", "message"],
      required: [true, "Please provide a notification type"],
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
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

// Indexes for efficient queries
NotificationSchema.index({ userId: 1, isRead: 1 })
NotificationSchema.index({ companyId: 1 })
NotificationSchema.index({ createdAt: -1 })

const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema)

export default Notification

