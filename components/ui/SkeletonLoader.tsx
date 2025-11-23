import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface SkeletonLoaderProps {
  type?: "card" | "table" | "list" | "form"
  count?: number
  className?: string
}

export function SkeletonLoader({
  type = "card",
  count = 3,
  className,
}: SkeletonLoaderProps) {
  if (type === "card") {
    return (
      <div className={className}>
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="mb-4">
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (type === "table") {
    return (
      <div className={className}>
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === "list") {
    return (
      <div className={className}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 mb-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === "form") {
    return (
      <div className={className}>
        <div className="space-y-4">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}

