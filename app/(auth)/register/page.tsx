"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

const registerSchema = z
  .object({
    companyName: z.string().min(1, "Company name is required"),
    companyEmail: z.string().email("Invalid email address"),
    companyPhone: z.string().optional(),
    companyAddress: z.string().optional(),
    subscriptionPlan: z.enum(["10_employees", "50_employees", "100_employees"]),
    adminName: z.string().min(1, "Admin name is required"),
    adminEmail: z.string().email("Invalid email address"),
    adminPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.adminPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      subscriptionPlan: "10_employees",
    },
  })

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Failed to create account")
        setIsLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-green-600">
              Registration Successful!
            </CardTitle>
            <CardDescription className="text-center">
              Your company and admin account have been created. Redirecting to login...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Register as Primary Admin
          </CardTitle>
          <CardDescription className="text-center">
            Create your company account and set up your admin credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    placeholder="Enter company name"
                    {...register("companyName")}
                    disabled={isLoading}
                  />
                  {errors.companyName && (
                    <p className="text-sm text-destructive">
                      {errors.companyName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Company Email *</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    placeholder="company@example.com"
                    {...register("companyEmail")}
                    disabled={isLoading}
                  />
                  {errors.companyEmail && (
                    <p className="text-sm text-destructive">
                      {errors.companyEmail.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Company Phone</Label>
                  <Input
                    id="companyPhone"
                    type="tel"
                    placeholder="+91 1234567890"
                    {...register("companyPhone")}
                    disabled={isLoading}
                  />
                  {errors.companyPhone && (
                    <p className="text-sm text-destructive">
                      {errors.companyPhone.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="companyAddress">Company Address</Label>
                  <Input
                    id="companyAddress"
                    placeholder="Enter company address"
                    {...register("companyAddress")}
                    disabled={isLoading}
                  />
                  {errors.companyAddress && (
                    <p className="text-sm text-destructive">
                      {errors.companyAddress.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="subscriptionPlan">Subscription Plan *</Label>
                  <select
                    id="subscriptionPlan"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    {...register("subscriptionPlan")}
                    disabled={isLoading}
                  >
                    <option value="10_employees">10 Employees - ₹4,000/year</option>
                    <option value="50_employees">50 Employees - ₹10,000/year</option>
                    <option value="100_employees">100 Employees - ₹20,000/year</option>
                  </select>
                  {errors.subscriptionPlan && (
                    <p className="text-sm text-destructive">
                      {errors.subscriptionPlan.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Admin Credentials */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Admin Credentials</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminName">Admin Name *</Label>
                  <Input
                    id="adminName"
                    placeholder="Enter admin name"
                    {...register("adminName")}
                    disabled={isLoading}
                  />
                  {errors.adminName && (
                    <p className="text-sm text-destructive">
                      {errors.adminName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Admin Email *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@example.com"
                    {...register("adminEmail")}
                    disabled={isLoading}
                  />
                  {errors.adminEmail && (
                    <p className="text-sm text-destructive">
                      {errors.adminEmail.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Password *</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    placeholder="Minimum 6 characters"
                    {...register("adminPassword")}
                    disabled={isLoading}
                  />
                  {errors.adminPassword && (
                    <p className="text-sm text-destructive">
                      {errors.adminPassword.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    {...register("confirmPassword")}
                    disabled={isLoading}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/15 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Register"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">
              Already have an account?{" "}
            </span>
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
