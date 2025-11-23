import * as XLSX from "xlsx"

/**
 * Import Validation Utilities
 */

export interface ValidationError {
  row: number
  field: string
  message: string
}

export interface ImportResult<T> {
  valid: T[]
  invalid: Array<{
    row: number
    data: any
    errors: ValidationError[]
  }>
}

/**
 * Parse Excel file
 */
export function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false })
        resolve(jsonData)
      } catch (error) {
        reject(new Error("Failed to parse Excel file"))
      }
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Parse CSV file
 */
export function parseCSVFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split("\n").filter((line) => line.trim())
        if (lines.length === 0) {
          resolve([])
          return
        }

        // Parse header
        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""))
        
        // Parse data rows
        const data = lines.slice(1).map((line, index) => {
          const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""))
          const row: any = {}
          headers.forEach((header, i) => {
            row[header] = values[i] || ""
          })
          return row
        })

        resolve(data)
      } catch (error) {
        reject(new Error("Failed to parse CSV file"))
      }
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsText(file, "UTF-8")
  })
}

/**
 * Validate required fields
 */
export function validateRequiredFields(
  data: any[],
  requiredFields: string[],
  fieldMapping?: Record<string, string>
): ValidationError[] {
  const errors: ValidationError[] = []
  const mapping = fieldMapping || {}

  data.forEach((row, index) => {
    requiredFields.forEach((field) => {
      const mappedField = mapping[field] || field
      const value = row[mappedField]
      if (!value || (typeof value === "string" && value.trim() === "")) {
        errors.push({
          row: index + 2, // +2 because row 1 is header, and arrays are 0-indexed
          field: mappedField,
          message: `${field} is required`,
        })
      }
    })
  })

  return errors
}

/**
 * Validate email format
 */
export function validateEmails(
  data: any[],
  emailField: string,
  fieldMapping?: Record<string, string>
): ValidationError[] {
  const errors: ValidationError[] = []
  const mapping = fieldMapping || {}
  const mappedField = mapping[emailField] || emailField
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  data.forEach((row, index) => {
    const email = row[mappedField]
    if (email && !emailRegex.test(email)) {
      errors.push({
        row: index + 2,
        field: mappedField,
        message: `Invalid email format: ${email}`,
      })
    }
  })

  return errors
}

/**
 * Validate date format
 */
export function validateDates(
  data: any[],
  dateFields: string[],
  fieldMapping?: Record<string, string>
): ValidationError[] {
  const errors: ValidationError[] = []
  const mapping = fieldMapping || {}

  data.forEach((row, index) => {
    dateFields.forEach((field) => {
      const mappedField = mapping[field] || field
      const dateValue = row[mappedField]
      if (dateValue) {
        const date = new Date(dateValue)
        if (isNaN(date.getTime())) {
          errors.push({
            row: index + 2,
            field: mappedField,
            message: `Invalid date format: ${dateValue}`,
          })
        }
      }
    })
  })

  return errors
}

/**
 * Validate numeric fields
 */
export function validateNumbers(
  data: any[],
  numberFields: string[],
  fieldMapping?: Record<string, string>
): ValidationError[] {
  const errors: ValidationError[] = []
  const mapping = fieldMapping || {}

  data.forEach((row, index) => {
    numberFields.forEach((field) => {
      const mappedField = mapping[field] || field
      const value = row[mappedField]
      if (value && isNaN(Number(value))) {
        errors.push({
          row: index + 2,
          field: mappedField,
          message: `${field} must be a number`,
        })
      }
    })
  })

  return errors
}

/**
 * Group validation errors by row
 */
export function groupErrorsByRow(errors: ValidationError[]): Record<number, ValidationError[]> {
  return errors.reduce((acc, error) => {
    if (!acc[error.row]) {
      acc[error.row] = []
    }
    acc[error.row].push(error)
    return acc
  }, {} as Record<number, ValidationError[]>)
}

/**
 * Validate and separate valid/invalid rows
 */
export function validateImportData<T>(
  data: any[],
  validator: (row: any, index: number) => ValidationError[]
): ImportResult<T> {
  const valid: T[] = []
  const invalid: Array<{
    row: number
    data: any
    errors: ValidationError[]
  }> = []

  data.forEach((row, index) => {
    const errors = validator(row, index)
    if (errors.length === 0) {
      valid.push(row as T)
    } else {
      invalid.push({
        row: index + 2,
        data: row,
        errors,
      })
    }
  })

  return { valid, invalid }
}

/**
 * Normalize field names (remove spaces, convert to lowercase)
 */
export function normalizeFieldNames(data: any[]): any[] {
  if (data.length === 0) return data

  return data.map((row) => {
    const normalized: any = {}
    Object.keys(row).forEach((key) => {
      const normalizedKey = key
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "")
      normalized[normalizedKey] = row[key]
    })
    return normalized
  })
}

/**
 * Map field names using a mapping object
 */
export function mapFieldNames(
  data: any[],
  fieldMapping: Record<string, string>
): any[] {
  return data.map((row) => {
    const mapped: any = {}
    Object.keys(row).forEach((key) => {
      const mappedKey = fieldMapping[key] || key
      mapped[mappedKey] = row[key]
    })
    return mapped
  })
}

