import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import connectDB from "@/lib/mongodb"
import Leave from "@/models/Leave"
import LeaveBalance from "@/models/LeaveBalance"
import User from "@/models/User"
import { z } from "zod"

const reportSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  department: z.string().optional(),
  role: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (
      !user ||
      (user.role !== "primary_admin" &&
        user.role !== "secondary_admin" &&
        user.role !== "hr_manager" &&
        user.role !== "operations_manager" &&
        user.role !== "team_lead")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = reportSchema.parse(body)

    await connectDB()

    const startDate = new Date(validatedData.startDate)
    const endDate = new Date(validatedData.endDate)

    // Build user query
    let userQuery: any = {
      companyId: user.companyId,
      isActive: true,
    }

    // Team leads can only see their team
    if (user.role === "team_lead") {
      userQuery.managerId = user.id
    }

    if (validatedData.role && validatedData.role !== "all") {
      userQuery.role = validatedData.role
    }

    const employees = await User.find(userQuery).select("name email role jobRole managerId")

    // Get leaves in date range
    const employeeIds = employees.map((e) => e._id)
    const leaves = await Leave.find({
      userId: { $in: employeeIds },
      fromDate: { $lte: endDate },
      toDate: { $gte: startDate },
    })
      .populate("userId", "name email role")
      .populate("approvedBy", "name")
      .sort({ fromDate: -1 })

    // Get leave balances
    const currentYear = new Date().getFullYear()
    const leaveBalances = await LeaveBalance.find({
      userId: { $in: employeeIds },
      companyId: user.companyId,
      year: currentYear,
    })

    const balanceMap = new Map()
    leaveBalances.forEach((balance) => {
      balanceMap.set(balance.userId.toString(), balance)
    })

    // Calculate statistics
    const leaveStats = {
      total: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
      byType: {
        earned: 0,
        sick: 0,
        comp_off: 0,
        casual: 0,
      },
    }

    const employeeLeaveMap = new Map()

    for (const employee of employees) {
      employeeLeaveMap.set(employee._id.toString(), {
        employeeId: employee._id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        role: employee.role,
        jobRole: employee.jobRole,
        leaveRequests: [],
        totalRequested: 0,
        totalApproved: 0,
        totalRejected: 0,
        totalPending: 0,
        leaveBalance: balanceMap.get(employee._id.toString()) || null,
      })
    }

    for (const leave of leaves) {
      const employee = leave.userId as any
      const employeeId = employee._id.toString()

      if (!employeeLeaveMap.has(employeeId)) continue

      const empData = employeeLeaveMap.get(employeeId)
      empData.leaveRequests.push({
        leaveId: leave._id,
        leaveType: leave.leaveType,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        numberOfDays: leave.numberOfDays,
        reason: leave.reason,
        status: leave.status,
        approvedBy: leave.approvedBy ? (leave.approvedBy as any).name : null,
        createdAt: leave.createdAt,
      })

      empData.totalRequested += leave.numberOfDays
      leaveStats.total += leave.numberOfDays
      leaveStats.byType[leave.leaveType as keyof typeof leaveStats.byType] += leave.numberOfDays

      switch (leave.status) {
        case "approved":
          empData.totalApproved += leave.numberOfDays
          leaveStats.approved += leave.numberOfDays
          break
        case "rejected":
          empData.totalRejected += leave.numberOfDays
          leaveStats.rejected += leave.numberOfDays
          break
        case "pending":
          empData.totalPending += leave.numberOfDays
          leaveStats.pending += leave.numberOfDays
          break
      }
    }

    // Group by department/role
    const roleBreakdown = new Map()

    for (const [employeeId, data] of employeeLeaveMap.entries()) {
      const role = data.role
      if (!roleBreakdown.has(role)) {
        roleBreakdown.set(role, {
          role,
          employeeCount: 0,
          totalRequested: 0,
          totalApproved: 0,
          totalRejected: 0,
          totalPending: 0,
        })
      }

      const roleData = roleBreakdown.get(role)
      roleData.employeeCount++
      roleData.totalRequested += data.totalRequested
      roleData.totalApproved += data.totalApproved
      roleData.totalRejected += data.totalRejected
      roleData.totalPending += data.totalPending
    }

    const reportData = Array.from(employeeLeaveMap.values())
    const departmentData = Array.from(roleBreakdown.values())

    return NextResponse.json({
      report: {
        type: "leave",
        period: {
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
        },
        summary: leaveStats,
        departmentBreakdown: departmentData,
        data: reportData,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Error generating leave report:", error)
    return NextResponse.json(
      { error: "Failed to generate leave report" },
      { status: 500 }
    )
  }
}

