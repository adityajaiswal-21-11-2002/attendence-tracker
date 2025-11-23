"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { useImport } from "@/hooks/useImport"
import { Progress } from "@/components/ui/progress"
import { useState, useRef } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface ImportButtonProps {
  endpoint: string
  label?: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  accept?: string
  additionalFields?: Array<{
    name: string
    label: string
    type?: "text" | "number" | "date"
    required?: boolean
  }>
  onSuccess?: (result: any) => void
}

export function ImportButton({
  endpoint,
  label = "Import",
  variant = "outline",
  size = "default",
  accept = ".csv,.xlsx,.xls",
  additionalFields = [],
  onSuccess,
}: ImportButtonProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any>(null)
  const [additionalData, setAdditionalData] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { previewImport, executeImport, isImporting, isPreviewing, progress } =
    useImport({
      onSuccess: (result) => {
        setOpen(false)
        setFile(null)
        setPreview(null)
        onSuccess?.(result)
      },
      onPreview: setPreview,
    })

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile)
    setPreview(null)
    try {
      const result = await previewImport(selectedFile, endpoint)
      setPreview(result)
    } catch (error) {
      // Error already handled by hook
    }
  }

  const handleImport = async () => {
    if (!file) return
    try {
      await executeImport(file, endpoint, additionalData)
    } catch (error) {
      // Error already handled by hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Upload className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Data</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to import data. Preview will be shown before import.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div className="space-y-2">
            <Label htmlFor="file">Select File</Label>
            <Input
              id="file"
              type="file"
              accept={accept}
              ref={fileInputRef}
              onChange={(e) => {
                const selectedFile = e.target.files?.[0]
                if (selectedFile) {
                  handleFileSelect(selectedFile)
                }
              }}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>

          {/* Additional Fields */}
          {additionalFields.length > 0 && (
            <div className="space-y-2">
              {additionalFields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id={field.name}
                    type={field.type || "text"}
                    required={field.required}
                    value={additionalData[field.name] || ""}
                    onChange={(e) =>
                      setAdditionalData({
                        ...additionalData,
                        [field.name]: e.target.value,
                      })
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {/* Progress */}
          {(isImporting || isPreviewing) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {isPreviewing ? "Previewing..." : "Importing..."}
                </span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Preview Results */}
          {preview && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center space-x-4 mt-2">
                    <Badge variant="outline">
                      Total: {preview.totalRows}
                    </Badge>
                    <Badge variant="default">
                      Valid: {preview.validRows}
                    </Badge>
                    {preview.invalidRows > 0 && (
                      <Badge variant="destructive">
                        Invalid: {preview.invalidRows}
                      </Badge>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {preview.invalid && preview.invalid.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-destructive">Validation Errors</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                    {preview.invalid.slice(0, 10).map((item: any, index: number) => (
                      <div key={index} className="text-sm mb-2">
                        <p className="font-medium">Row {item.row}:</p>
                        <ul className="list-disc list-inside ml-2">
                          {item.errors.map((error: any, errIndex: number) => (
                            <li key={errIndex} className="text-destructive">
                              {error.field}: {error.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    {preview.invalid.length > 10 && (
                      <p className="text-sm text-muted-foreground">
                        ... and {preview.invalid.length - 10} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}

              {preview.sample && preview.sample.length > 0 && (
                <div className="space-y-2">
                  <Label>Sample Data (first 5 rows)</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          {Object.keys(preview.sample[0]).map((key) => (
                            <th key={key} className="p-2 text-left">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.sample.map((row: any, index: number) => (
                          <tr key={index} className="border-t">
                            {Object.values(row).map((value: any, valIndex: number) => (
                              <td key={valIndex} className="p-2">
                                {String(value || "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false)
              setFile(null)
              setPreview(null)
              if (fileInputRef.current) {
                fileInputRef.current.value = ""
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || !preview || preview.validRows === 0 || isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Import {preview?.validRows || 0} rows
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

