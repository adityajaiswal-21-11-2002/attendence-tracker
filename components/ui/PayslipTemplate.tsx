import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Building2, User, Calendar, DollarSign } from "lucide-react"

interface PayslipTemplateProps {
  companyName: string
  companyAddress?: string
  employeeName: string
  employeeId: string
  employeeEmail?: string
  month: number
  year: number
  earnings: {
    label: string
    amount: number
  }[]
  deductions: {
    label: string
    amount: number
  }[]
  grossPay: number
  totalDeductions: number
  netPay: number
  attendanceSummary?: {
    totalDays: number
    presentDays: number
    absentDays: number
    leaveDays: number
    overtimeHours?: number
  }
  className?: string
}

export function PayslipTemplate({
  companyName,
  companyAddress,
  employeeName,
  employeeId,
  employeeEmail,
  month,
  year,
  earnings,
  deductions,
  grossPay,
  totalDeductions,
  netPay,
  attendanceSummary,
  className,
}: PayslipTemplateProps) {
  const periodStart = new Date(year, month - 1, 1)
  const periodEnd = new Date(year, month, 0)

  return (
    <Card className={className}>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Building2 className="h-5 w-5" />
              <CardTitle className="text-2xl">{companyName}</CardTitle>
            </div>
            {companyAddress && (
              <p className="text-sm text-muted-foreground">{companyAddress}</p>
            )}
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            PAYSLIP
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Employee Details</span>
            </div>
            <div className="pl-6 space-y-1">
              <p className="font-semibold">{employeeName}</p>
              <p className="text-sm text-muted-foreground">ID: {employeeId}</p>
              {employeeEmail && (
                <p className="text-sm text-muted-foreground">{employeeEmail}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Pay Period</span>
            </div>
            <div className="pl-6 space-y-1">
              <p className="font-semibold">
                {format(periodStart, "MMM dd")} - {format(periodEnd, "MMM dd, yyyy")}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(periodStart, "MMMM yyyy")}
              </p>
            </div>
          </div>
        </div>

        {attendanceSummary && (
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-3">Attendance Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Days</p>
                <p className="font-semibold">{attendanceSummary.totalDays}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Present</p>
                <p className="font-semibold text-green-600">
                  {attendanceSummary.presentDays}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Absent</p>
                <p className="font-semibold text-red-600">
                  {attendanceSummary.absentDays}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">On Leave</p>
                <p className="font-semibold text-blue-600">
                  {attendanceSummary.leaveDays}
                </p>
              </div>
              {attendanceSummary.overtimeHours !== undefined && (
                <div className="col-span-2 md:col-span-4">
                  <p className="text-muted-foreground">Overtime Hours</p>
                  <p className="font-semibold">
                    {attendanceSummary.overtimeHours.toFixed(2)} hrs
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-semibold mb-3 flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Earnings</span>
            </h3>
            <div className="space-y-2">
              {earnings.map((earning, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <span className="text-sm">{earning.label}</span>
                  <span className="font-medium">₹{earning.amount.toLocaleString()}</span>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between py-2 font-semibold">
                <span>Gross Pay</span>
                <span>₹{grossPay.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Deductions</h3>
            <div className="space-y-2">
              {deductions.length > 0 ? (
                deductions.map((deduction, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <span className="text-sm">{deduction.label}</span>
                    <span className="font-medium">
                      ₹{deduction.amount.toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-2">No deductions</p>
              )}
              <Separator />
              <div className="flex items-center justify-between py-2 font-semibold">
                <span>Total Deductions</span>
                <span>₹{totalDeductions.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
          <span className="text-lg font-semibold">Net Pay</span>
          <span className="text-2xl font-bold text-primary">
            ₹{netPay.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

