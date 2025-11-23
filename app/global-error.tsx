"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">500</h1>
            <h2 className="text-2xl font-semibold mb-2">Internal Server Error</h2>
            <p className="text-muted-foreground mb-4">
              Something went wrong on our end. Please try again later.
            </p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}

