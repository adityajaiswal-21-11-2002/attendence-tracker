"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle>Something went wrong!</CardTitle>
          </div>
          <CardDescription>
            An unexpected error occurred. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.message && (
            <div className="p-3 bg-destructive/10 rounded-lg">
              <p className="text-sm text-destructive">{error.message}</p>
            </div>
          )}
          <div className="flex space-x-2">
            <Button onClick={reset} className="flex-1">
              Try again
            </Button>
            <Button variant="outline" onClick={() => window.location.href = "/dashboard"} className="flex-1">
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

