// Email utility for sending payslips
// Note: Install nodemailer: npm install nodemailer @types/nodemailer

export interface EmailOptions {
  to: string
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType: string
  }>
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  // Check if nodemailer is available
  try {
    const nodemailer = await import("nodemailer")

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "noreply@attendance-tracker.com",
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    })
  } catch (error) {
    console.error("Error sending email:", error)
    // If nodemailer is not installed, log the error but don't throw
    // This allows the system to work without email functionality
    if (error instanceof Error && error.message.includes("Cannot find module")) {
      console.warn(
        "Nodemailer not installed. Install it with: npm install nodemailer @types/nodemailer"
      )
    } else {
      throw error
    }
  }
}

export function generatePayslipEmailHTML(
  employeeName: string,
  month: number,
  year: number,
  netPay: number,
  currency: string = "INR"
): string {
  const monthName = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9fafb; }
        .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payslip for ${monthName}</h1>
        </div>
        <div class="content">
          <p>Dear ${employeeName},</p>
          <p>Your payslip for ${monthName} has been generated.</p>
          <p><strong>Net Pay: ${currency} ${netPay.toLocaleString()}</strong></p>
          <p>Please find your payslip attached to this email.</p>
          <p>You can also download it from your employee portal.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

