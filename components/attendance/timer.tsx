"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, Square } from "lucide-react"
import { format } from "date-fns"

interface TimerProps {
  startTime?: Date
  pausedDuration?: number // in seconds
  onStart?: () => void
  onPause?: () => void
  onStop?: () => void
  isRunning?: boolean
  isPaused?: boolean
}

export function Timer({
  startTime,
  pausedDuration = 0,
  onStart,
  onPause,
  onStop,
  isRunning = false,
  isPaused = false,
}: TimerProps) {
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isRunning && startTime) {
      intervalRef.current = setInterval(() => {
        const now = new Date()
        const elapsedSeconds = Math.floor(
          (now.getTime() - new Date(startTime).getTime()) / 1000
        )
        setElapsed(elapsedSeconds - pausedDuration)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, startTime, pausedDuration])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex items-center gap-4">
      <div className="text-2xl font-mono font-bold">
        {formatTime(elapsed)}
      </div>
      <div className="flex gap-2">
        {!isRunning && !isPaused && (
          <Button size="sm" onClick={onStart}>
            <Play className="mr-2 h-4 w-4" />
            Start
          </Button>
        )}
        {isRunning && (
          <Button size="sm" variant="outline" onClick={onPause}>
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </Button>
        )}
        {isPaused && (
          <Button size="sm" onClick={onStart}>
            <Play className="mr-2 h-4 w-4" />
            Resume
          </Button>
        )}
        {(isRunning || isPaused) && (
          <Button size="sm" variant="destructive" onClick={onStop}>
            <Square className="mr-2 h-4 w-4" />
            Complete
          </Button>
        )}
      </div>
    </div>
  )
}

