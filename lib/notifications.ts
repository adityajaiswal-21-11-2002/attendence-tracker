import connectDB from "@/lib/mongodb"
import Notification from "@/models/Notification"
import User from "@/models/User"

export interface CreateNotificationParams {
  userId: string
  companyId: string
  type: "leave_approval" | "announcement" | "system" | "message"
  title: string
  message: string
}

/**
 * Create a notification for a single user
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<void> {
  try {
    await connectDB()
    await Notification.create(params)
  } catch (error) {
    console.error("Error creating notification:", error)
    // Don't throw - notifications shouldn't break the main flow
  }
}

/**
 * Create notifications for multiple users
 */
export async function createNotificationsForUsers(
  userIds: string[],
  companyId: string,
  type: "leave_approval" | "announcement" | "system" | "message",
  title: string,
  message: string
): Promise<void> {
  try {
    await connectDB()

    const notifications = userIds.map((userId) => ({
      userId,
      companyId,
      type,
      title,
      message,
      isRead: false,
    }))

    if (notifications.length > 0) {
      await Notification.insertMany(notifications)
    }
  } catch (error) {
    console.error("Error creating notifications for users:", error)
    // Don't throw - notifications shouldn't break the main flow
  }
}

/**
 * Create notification for leave approval/rejection
 */
export async function notifyLeaveStatus(
  userId: string,
  companyId: string,
  status: "approved" | "rejected",
  leaveDetails: {
    leaveType: string
    fromDate: Date
    toDate: Date
    numberOfDays: number
    comments?: string
  }
): Promise<void> {
  const statusText = status === "approved" ? "Approved" : "Rejected"
  const leaveTypeLabels: Record<string, string> = {
    earned: "Earned Leave",
    sick: "Sick Leave",
    comp_off: "Comp Off",
    casual: "Casual Leave",
  }

  await createNotification({
    userId,
    companyId,
    type: "leave_approval",
    title: `Leave Request ${statusText}`,
    message: `Your ${leaveTypeLabels[leaveDetails.leaveType] || leaveDetails.leaveType} request for ${leaveDetails.numberOfDays} day(s) (${leaveDetails.fromDate.toLocaleDateString()} - ${leaveDetails.toDate.toLocaleDateString()}) has been ${statusText.toLowerCase()}.${leaveDetails.comments ? ` Comments: ${leaveDetails.comments}` : ""}`,
  })
}

/**
 * Create notification for manager when leave is submitted
 */
export async function notifyManagerLeaveRequest(
  managerId: string,
  companyId: string,
  employeeName: string,
  leaveDetails: {
    leaveType: string
    fromDate: Date
    toDate: Date
    numberOfDays: number
  }
): Promise<void> {
  const leaveTypeLabels: Record<string, string> = {
    earned: "Earned Leave",
    sick: "Sick Leave",
    comp_off: "Comp Off",
    casual: "Casual Leave",
  }

  await createNotification({
    userId: managerId,
    companyId,
    type: "leave_approval",
    title: "New Leave Request",
    message: `${employeeName} has submitted a ${leaveTypeLabels[leaveDetails.leaveType] || leaveDetails.leaveType} request for ${leaveDetails.numberOfDays} day(s) (${leaveDetails.fromDate.toLocaleDateString()} - ${leaveDetails.toDate.toLocaleDateString()}). Please review and approve.`,
  })
}

/**
 * Create notification for roster update
 */
export async function notifyRosterUpdate(
  userId: string,
  companyId: string,
  date: Date,
  shiftDetails: {
    shiftType: string
    shiftTime: { start: string; end: string }
  }
): Promise<void> {
  await createNotification({
    userId,
    companyId,
    type: "system",
    title: "Roster Updated",
    message: `Your roster has been updated for ${date.toLocaleDateString()}. Shift: ${shiftDetails.shiftType} (${shiftDetails.shiftTime.start} - ${shiftDetails.shiftTime.end})`,
  })
}

/**
 * Create notification for salary/payslip generation
 */
export async function notifyPayslipGenerated(
  userId: string,
  companyId: string,
  month: number,
  year: number,
  netPay: number
): Promise<void> {
  const monthName = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  await createNotification({
    userId,
    companyId,
    type: "system",
    title: "Payslip Generated",
    message: `Your payslip for ${monthName} has been generated. Net Pay: ₹${netPay.toLocaleString()}. You can download it from your salary page.`,
  })
}

