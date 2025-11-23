import Attendance from "@/models/Attendance"
import SalaryConfiguration from "@/models/SalaryConfiguration"
import Leave from "@/models/Leave"
import Holiday from "@/models/Holiday"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns"

export interface AttendanceSummary {
  totalDays: number
  presentDays: number
  absentDays: number
  halfDays: number
  leaveDays: number
  totalHours: number
  overtimeHours: number
  standardHours: number
}

export interface SalaryCalculationResult {
  basePay: number
  overtimePay: number
  grossPay: number
  deductions: Array<{ name: string; amount: number; type: string }>
  totalDeductions: number
  netPay: number
  attendanceSummary: AttendanceSummary
}

/**
 * Calculate attendance summary for a given month
 */
export async function calculateAttendanceSummary(
  userId: string,
  month: number,
  year: number,
  standardHoursPerDay: number = 8
): Promise<AttendanceSummary> {
  const startDate = startOfMonth(new Date(year, month - 1, 1))
  const endDate = endOfMonth(new Date(year, month - 1, 1))

  // Get all attendance records for the month
  const attendanceRecords = await Attendance.find({
    userId,
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  })

  // Get all holidays for the month
  const holidays = await Holiday.find({
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  })

  const holidayDates = holidays.map((h) => format(new Date(h.date), "yyyy-MM-dd"))

  // Get all approved leaves for the month
  const leaves = await Leave.find({
    userId,
    status: "approved",
    fromDate: { $lte: endDate },
    toDate: { $gte: startDate },
  })

  // Calculate working days (excluding weekends and holidays)
  const allDays = eachDayOfInterval({ start: startDate, end: endDate })
  const workingDays = allDays.filter(
    (day) => !isWeekend(day) && !holidayDates.includes(format(day, "yyyy-MM-dd"))
  )

  let presentDays = 0
  let absentDays = 0
  let halfDays = 0
  let leaveDays = 0
  let totalHours = 0
  let overtimeHours = 0

  // Process each day
  for (const day of allDays) {
    const dayStr = format(day, "yyyy-MM-dd")
    const isHoliday = holidayDates.includes(dayStr)
    const isWeekendDay = isWeekend(day)

    // Check if there's a leave for this day
    const hasLeave = leaves.some((leave) => {
      const leaveStart = format(new Date(leave.fromDate), "yyyy-MM-dd")
      const leaveEnd = format(new Date(leave.toDate), "yyyy-MM-dd")
      return dayStr >= leaveStart && dayStr <= leaveEnd
    })

    const attendance = attendanceRecords.find(
      (a) => format(new Date(a.date), "yyyy-MM-dd") === dayStr
    )

    if (isHoliday || isWeekendDay) {
      // Don't count holidays/weekends
      continue
    }

    if (hasLeave) {
      leaveDays++
      continue
    }

    if (!attendance) {
      absentDays++
      continue
    }

    switch (attendance.status) {
      case "present":
        presentDays++
        const hours = attendance.totalHours || 0
        totalHours += hours
        if (hours > standardHoursPerDay) {
          overtimeHours += hours - standardHoursPerDay
        }
        break
      case "half_day":
        halfDays++
        const halfHours = (attendance.totalHours || 0) / 2
        totalHours += halfHours
        break
      case "absent":
        absentDays++
        break
    }
  }

  return {
    totalDays: workingDays.length,
    presentDays,
    absentDays,
    halfDays,
    leaveDays,
    totalHours,
    overtimeHours,
    standardHours: workingDays.length * standardHoursPerDay,
  }
}

/**
 * Calculate salary for an employee for a specific month
 */
export async function calculateSalary(
  userId: string,
  companyId: string,
  month: number,
  year: number
): Promise<SalaryCalculationResult> {
  // Get salary configuration
  const config = await SalaryConfiguration.findOne({ userId, companyId })

  if (!config) {
    throw new Error("Salary configuration not found for employee")
  }

  // Calculate attendance summary
  const attendanceSummary = await calculateAttendanceSummary(
    userId,
    month,
    year,
    config.standardHoursPerDay || 8
  )

  let basePay = 0
  let overtimePay = 0

  // Calculate base pay based on salary type
  switch (config.salaryType) {
    case "fixed":
      // For fixed salary, deduct for absents and half days
      const daysWorked = attendanceSummary.presentDays + attendanceSummary.halfDays * 0.5
      const totalWorkingDays = config.standardDaysPerMonth || 22
      basePay = (config.baseAmount / totalWorkingDays) * daysWorked
      break

    case "hourly":
      // For hourly, pay based on hours worked
      const hourlyRate = config.baseAmount / (config.standardHoursPerDay || 8)
      const regularHours = Math.min(attendanceSummary.totalHours, attendanceSummary.standardHours)
      basePay = hourlyRate * regularHours

      // Calculate overtime if enabled
      if (config.overtimeEnabled && attendanceSummary.overtimeHours > 0) {
        const overtimeRate = hourlyRate * (config.overtimeRate || 1.5)
        overtimePay = overtimeRate * attendanceSummary.overtimeHours
      }
      break

    case "commission":
      // For commission, base pay is fixed, commission would be calculated separately
      basePay = config.baseAmount
      // Note: Commission calculation would need additional logic based on sales/performance
      break
  }

  // Calculate deductions
  const deductions: Array<{ name: string; amount: number; type: string }> = []
  let totalDeductions = 0

  for (const deduction of config.deductions) {
    if (!deduction.isActive) continue

    let deductionAmount = 0
    if (deduction.type === "fixed") {
      deductionAmount = deduction.amount
    } else if (deduction.type === "percentage") {
      deductionAmount = (basePay * deduction.amount) / 100
    }

    deductions.push({
      name: deduction.name,
      amount: deductionAmount,
      type: deduction.type,
    })
    totalDeductions += deductionAmount
  }

  // Deduct for absent days (for fixed salary)
  if (config.salaryType === "fixed" && attendanceSummary.absentDays > 0) {
    const dailyRate = config.baseAmount / (config.standardDaysPerMonth || 22)
    const absentDeduction = dailyRate * attendanceSummary.absentDays
    deductions.push({
      name: "Absent Days Deduction",
      amount: absentDeduction,
      type: "other",
    })
    totalDeductions += absentDeduction
    basePay -= absentDeduction
  }

  const grossPay = basePay + overtimePay
  const netPay = Math.max(0, grossPay - totalDeductions)

  return {
    basePay,
    overtimePay,
    grossPay,
    deductions,
    totalDeductions,
    netPay,
    attendanceSummary,
  }
}

