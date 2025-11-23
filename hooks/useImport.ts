"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { parseExcelFile, parseCSVFile } from "@/lib/importUtils"

interface UseImportOptions {
  onSuccess?: (result: any) => void
  onError?: (error: string) => void
  onPreview?: (preview: any) => void
}

export function useImport(options?: UseImportOptions) {
  const [isImporting, setIsImporting] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()

  const previewImport = async (
    file: File,
    endpoint: string
  ): Promise<any> => {
    setIsPreviewing(true)
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("preview", "true")

      setProgress(30)

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      })

      setProgress(60)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Preview failed")
      }

      setProgress(90)

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Preview failed")
      }

      setProgress(100)

      options?.onPreview?.(result)
      return result
    } catch (error: any) {
      const errorMessage = error.message || "Failed to preview import"
      toast({
        title: "Preview failed",
        description: errorMessage,
        variant: "destructive",
      })
      options?.onError?.(errorMessage)
      throw error
    } finally {
      setIsPreviewing(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  const executeImport = async (
    file: File,
    endpoint: string,
    additionalData?: Record<string, string>
  ): Promise<any> => {
    setIsImporting(true)
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("preview", "false")

      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, value)
        })
      }

      setProgress(20)

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      })

      setProgress(50)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Import failed")
      }

      setProgress(80)

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Import failed")
      }

      setProgress(100)

      toast({
        title: "Import successful",
        description: `Successfully imported ${result.imported || 0} record(s)${
          result.failed > 0 ? `, ${result.failed} failed` : ""
        }`,
      })

      options?.onSuccess?.(result)
      return result
    } catch (error: any) {
      const errorMessage = error.message || "Failed to import data"
      toast({
        title: "Import failed",
        description: errorMessage,
        variant: "destructive",
      })
      options?.onError?.(errorMessage)
      throw error
    } finally {
      setIsImporting(false)
      setTimeout(() => setProgress(0), 1000)
    }
  }

  const parseFile = async (file: File): Promise<any[]> => {
    const fileExtension = file.name.split(".").pop()?.toLowerCase()

    if (fileExtension === "xlsx" || fileExtension === "xls") {
      return await parseExcelFile(file)
    } else if (fileExtension === "csv") {
      return await parseCSVFile(file)
    } else {
      throw new Error("Unsupported file format. Please use CSV or Excel.")
    }
  }

  return {
    previewImport,
    executeImport,
    parseFile,
    isImporting,
    isPreviewing,
    progress,
  }
}

