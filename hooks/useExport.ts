"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  exportToExcel,
  exportToCSV,
  exportSingleSheetToExcel,
  formatDateForExcel,
  type ExcelColumn,
} from "@/lib/exportUtils"
import { format as formatDate } from "date-fns"

interface UseExportOptions {
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function useExport(options?: UseExportOptions) {
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()

  const exportData = async (
    endpoint: string,
    params: Record<string, string>,
    format: "excel" | "csv" = "excel",
    filename?: string
  ) => {
    setIsExporting(true)
    setProgress(0)

    try {
      // Build query string
      const queryParams = new URLSearchParams({
        ...params,
        format,
      }).toString()

      setProgress(25)

      const response = await fetch(`${endpoint}?${queryParams}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Export failed")
      }

      setProgress(50)

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Export failed")
      }

      setProgress(75)

      // Convert columns format
      const excelColumns: ExcelColumn[] = (result.columns || []).map((col: any) => ({
        header: col.header,
        key: col.key,
        width: col.width,
        format: col.format === "date" ? formatDateForExcel : undefined,
      }))

      const exportFormat = format
      const exportFilename = filename || result.filename || "export"
      const dateStr = formatDate(new Date(), "yyyy-MM-dd")

      // Handle CSV export
      if (exportFormat === "csv" && result.data) {
        exportToCSV(
          result.data,
          result.columns || [],
          `${exportFilename}-${dateStr}.csv`
        )
      } else if (exportFormat === "excel" && result.data) {
        // Handle Excel export
        exportSingleSheetToExcel(
          result.data,
          excelColumns,
          "Sheet1",
          `${exportFilename}-${dateStr}.xlsx`
        )
      }

      setProgress(100)

      toast({
        title: "Export successful",
        description: `Data exported successfully as ${format.toUpperCase()}`,
      })

      options?.onSuccess?.()
    } catch (error: any) {
      const errorMessage = error.message || "Failed to export data"
      toast({
        title: "Export failed",
        description: errorMessage,
        variant: "destructive",
      })
      options?.onError?.(errorMessage)
    } finally {
      setIsExporting(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  const exportExcel = (
    data: any[],
    columns: ExcelColumn[],
    filename?: string
  ) => {
    try {
      exportSingleSheetToExcel(data, columns, "Sheet1", filename)
      toast({
        title: "Export successful",
        description: "Data exported to Excel",
      })
      options?.onSuccess?.()
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export data",
        variant: "destructive",
      })
      options?.onError?.(error.message)
    }
  }

  const exportCSV = (
    data: any[],
    columns: { key: string; header: string }[],
    filename?: string
  ) => {
    try {
      exportToCSV(data, columns, filename)
      toast({
        title: "Export successful",
        description: "Data exported to CSV",
      })
      options?.onSuccess?.()
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export data",
        variant: "destructive",
      })
      options?.onError?.(error.message)
    }
  }

  return {
    exportData,
    exportExcel,
    exportCSV,
    isExporting,
    progress,
  }
}

