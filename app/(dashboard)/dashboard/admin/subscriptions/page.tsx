"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Edit, AlertTriangle } from "lucide-react"
import { format, isAfter, differenceInDays } from "date-fns"

interface Subscription {
  _id: string
  companyId: {
    _id: string
    name: string
    email: string
  }
  subscriptionPlan: string
  subscriptionPrice: number
  subscriptionExpiry: string
  isActive: boolean
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [formData, setFormData] = useState({
    subscriptionPlan: "",
    subscriptionPrice: 0,
  })

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      const response = await fetch("/api/primary-admin/subscriptions")
      const data = await response.json()
      setSubscriptions(data.subscriptions || [])
    } catch (error) {
      console.error("Error fetching subscriptions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSubscription) return

    try {
      const response = await fetch(
        `/api/primary-admin/subscriptions/${selectedSubscription._id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      )

      if (response.ok) {
        setDialogOpen(false)
        setSelectedSubscription(null)
        fetchSubscriptions()
      }
    } catch (error) {
      console.error("Error updating subscription:", error)
    }
  }

  const handleEdit = (subscription: Subscription) => {
    setSelectedSubscription(subscription)
    setFormData({
      subscriptionPlan: subscription.subscriptionPlan,
      subscriptionPrice: subscription.subscriptionPrice,
    })
    setDialogOpen(true)
  }

  const isExpiringSoon = (expiryDate: string) => {
    const daysUntilExpiry = differenceInDays(new Date(expiryDate), new Date())
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0
  }

  const isExpired = (expiryDate: string) => {
    return isAfter(new Date(), new Date(expiryDate))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscription Management</h1>
        <p className="text-muted-foreground">
          Manage company subscriptions and pricing
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscriptions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptions.filter((s) => s.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscriptions.filter((s) => isExpiringSoon(s.subscriptionExpiry)).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
          <CardDescription>
            Manage subscription plans and pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((subscription) => {
                  const expiringSoon = isExpiringSoon(subscription.subscriptionExpiry)
                  const expired = isExpired(subscription.subscriptionExpiry)

                  return (
                    <TableRow key={subscription._id}>
                      <TableCell className="font-medium">
                        {subscription.companyId.name}
                      </TableCell>
                      <TableCell>
                        {subscription.subscriptionPlan.replace("_", " ")}
                      </TableCell>
                      <TableCell>₹{subscription.subscriptionPrice.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {format(new Date(subscription.subscriptionExpiry), "MMM dd, yyyy")}
                          {expiringSoon && (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                          {expired && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            subscription.isActive && !expired
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {expired ? "Expired" : subscription.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(subscription)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Subscription</DialogTitle>
            <DialogDescription>
              Update subscription plan and pricing
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subscriptionPlan">Subscription Plan</Label>
                <Select
                  id="subscriptionPlan"
                  value={formData.subscriptionPlan}
                  onChange={(e) => {
                    const plan = e.target.value
                    const prices: Record<string, number> = {
                      "10_employees": 4000,
                      "50_employees": 10000,
                      "100_employees": 20000,
                    }
                    setFormData({
                      subscriptionPlan: plan,
                      subscriptionPrice: prices[plan] || 0,
                    })
                  }}
                  required
                >
                  <option value="10_employees">10 Employees - ₹4,000/year</option>
                  <option value="50_employees">50 Employees - ₹10,000/year</option>
                  <option value="100_employees">100 Employees - ₹20,000/year</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscriptionPrice">Price (₹)</Label>
                <Input
                  id="subscriptionPrice"
                  type="number"
                  value={formData.subscriptionPrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      subscriptionPrice: Number(e.target.value),
                    })
                  }
                  required
                  min={0}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

