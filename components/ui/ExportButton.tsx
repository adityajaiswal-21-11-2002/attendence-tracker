"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { useExport } from "@/hooks/useExport"
import { Progress } from "@/components/ui/progress"
import { useState } from "react"

interface ExportButtonProps {
  endpoint: string
  params?: Record<string, string>
  filename?: string
  label?: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
}

export function ExportButton({
  endpoint,
  params = {},
  filename,
  label = "Export",
  variant = "outline",
  size = "default",
}: ExportButtonProps) {
  const { exportData, isExporting, progress } = useExport()
  const [showProgress, setShowProgress] = useState(false)

  const handleExport = async (format: "excel" | "csv") => {
    setShowProgress(true)
    try {
      await exportData(endpoint, params, format, filename)
    } finally {
      setTimeout(() => setShowProgress(false), 1000)
    }
  }

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                {label}
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => handleExport("excel")}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export as Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("csv")}>
            <FileText className="mr-2 h-4 w-4" />
            Export as CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {showProgress && progress > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2">
          <Progress value={progress} className="h-1" />
        </div>
      )}
    </div>
  )
}

