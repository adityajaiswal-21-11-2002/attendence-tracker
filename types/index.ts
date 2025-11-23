// Re-export model interfaces for convenience
export type {
  IUser as User,
} from "@/models/User"

export type {
  ICompany as Company,
} from "@/models/Company"

export type {
  IAttendance as Attendance,
  IBreak as Break,
  ITaskTime as TaskTime,
} from "@/models/Attendance"

export type {
  ILeave as Leave,
} from "@/models/Leave"

export type {
  ILeaveBalance as LeaveBalance,
} from "@/models/LeaveBalance"

export type {
  IRoster as Roster,
  IRosterTask as RosterTask,
} from "@/models/Roster"

export type {
  ITask as Task,
  ITimeTracking as TimeTracking,
} from "@/models/Task"

export type {
  INotification as Notification,
} from "@/models/Notification"

export type {
  IAnnouncement as Announcement,
} from "@/models/Announcement"

export type {
  IHoliday as Holiday,
} from "@/models/Holiday"

// Additional utility types
export interface AttendanceRecord {
  user: User
  attendance: Attendance[]
}

export type UserRole =
  | "primary_admin"
  | "secondary_admin"
  | "hr_manager"
  | "operations_manager"
  | "team_lead"
  | "employee"

export type SubscriptionPlan = "10_employees" | "50_employees" | "100_employees"

export type LeaveType = "earned" | "sick" | "comp_off" | "casual"

export type LeaveStatus = "pending" | "approved" | "rejected"

export type AttendanceStatus = "present" | "absent" | "half_day" | "holiday" | "leave"

export type TaskStatus = "not_started" | "in_progress" | "paused" | "completed"

export type ShiftType = "morning" | "evening" | "night" | "custom"

export type NotificationType = "leave_approval" | "announcement" | "system" | "message"

