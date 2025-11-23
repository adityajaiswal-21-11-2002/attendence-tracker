/**
 * Backup script for exporting database data
 * Run with: npx tsx scripts/backup.ts
 */

import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables FIRST before importing anything that uses them
config({ path: resolve(process.cwd(), ".env.local") })
config({ path: resolve(process.cwd(), ".env") })

import fs from "fs"
import path from "path"
import connectDB from "../lib/mongodb"
import User from "../models/User"
import Company from "../models/Company"
import Attendance from "../models/Attendance"
import Leave from "../models/Leave"
import LeaveBalance from "../models/LeaveBalance"
import Payslip from "../models/Payslip"
import Roster from "../models/Roster"
import Task from "../models/Task"
import Holiday from "../models/Holiday"
import Notification from "../models/Notification"
import Announcement from "../models/Announcement"
import SalaryConfiguration from "../models/SalaryConfiguration"

const BACKUP_DIR = path.join(process.cwd(), "backups")

async function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

async function backupCollection(name: string, Model: any) {
  try {
    const data = await Model.find({}).lean()
    const filename = path.join(BACKUP_DIR, `${name}-${Date.now()}.json`)
    fs.writeFileSync(filename, JSON.stringify(data, null, 2))
    console.log(`✓ Backed up ${name}: ${data.length} records -> ${filename}`)
    return { name, count: data.length, filename }
  } catch (error) {
    console.error(`✗ Error backing up ${name}:`, error)
    return { name, count: 0, filename: null, error }
  }
}

async function backup() {
  try {
    console.log("Connecting to database...")
    await connectDB()

    await ensureBackupDir()

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupFolder = path.join(BACKUP_DIR, `backup-${timestamp}`)
    fs.mkdirSync(backupFolder, { recursive: true })

    console.log(`\nStarting backup to ${backupFolder}...\n`)

    const results = []

    // Backup all collections
    results.push(await backupCollection("companies", Company))
    results.push(await backupCollection("users", User))
    results.push(await backupCollection("attendance", Attendance))
    results.push(await backupCollection("leaves", Leave))
    results.push(await backupCollection("leave-balances", LeaveBalance))
    results.push(await backupCollection("payslips", Payslip))
    results.push(await backupCollection("rosters", Roster))
    results.push(await backupCollection("tasks", Task))
    results.push(await backupCollection("holidays", Holiday))
    results.push(await backupCollection("notifications", Notification))
    results.push(await backupCollection("announcements", Announcement))
    results.push(await backupCollection("salary-configurations", SalaryConfiguration))

    // Create summary
    const summary = {
      timestamp: new Date().toISOString(),
      collections: results.map((r) => ({
        name: r.name,
        count: r.count,
        status: r.error ? "failed" : "success",
      })),
      totalRecords: results.reduce((sum, r) => sum + r.count, 0),
    }

    const summaryFile = path.join(backupFolder, "summary.json")
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2))

    console.log("\n✅ Backup completed!")
    console.log(`\nSummary:`)
    console.log(`  Total records: ${summary.totalRecords}`)
    console.log(`  Backup location: ${backupFolder}`)
    console.log(`  Summary file: ${summaryFile}`)

    process.exit(0)
  } catch (error) {
    console.error("Error during backup:", error)
    process.exit(1)
  }
}

backup()

