import mongoose, { Schema, Document, Model } from "mongoose"

export interface IHoliday extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  date: Date
  isNational: boolean
  createdAt: Date
  updatedAt: Date
}

const HolidaySchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a holiday name"],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Please provide a date"],
      unique: true,
    },
    isNational: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for efficient queries
HolidaySchema.index({ date: 1 })
HolidaySchema.index({ isNational: 1 })

const Holiday: Model<IHoliday> =
  mongoose.models.Holiday || mongoose.model<IHoliday>("Holiday", HolidaySchema)

// Helper function to calculate variable Indian holidays
// Note: These are approximations. For production, use a proper lunar calendar library
function getIndianHolidayDates(year: number): Array<{ name: string; date: Date; isNational: boolean }> {
  // Fixed date holidays
  const holidays: Array<{ name: string; date: Date; isNational: boolean }> = [
    { name: "New Year Day", date: new Date(year, 0, 1), isNational: true },
    { name: "Republic Day", date: new Date(year, 0, 26), isNational: true },
    { name: "Independence Day", date: new Date(year, 7, 15), isNational: true },
    { name: "Gandhi Jayanti", date: new Date(year, 9, 2), isNational: true },
    { name: "Christmas", date: new Date(year, 11, 25), isNational: true },
  ]

  // Variable holidays - approximate dates based on common patterns
  // These should be updated annually or use a proper lunar calendar library
  const variableHolidays: Record<number, Record<string, { month: number; day: number }>> = {
    2024: {
      Holi: { month: 2, day: 25 },
      GoodFriday: { month: 2, day: 29 },
      BuddhaPurnima: { month: 4, day: 23 },
      Muharram: { month: 6, day: 17 },
      DurgaAshtami: { month: 9, day: 12 },
      Dussehra: { month: 9, day: 12 },
      Diwali: { month: 10, day: 1 },
      GuruNanakJayanti: { month: 10, day: 15 },
    },
    2025: {
      Holi: { month: 2, day: 14 },
      GoodFriday: { month: 3, day: 18 },
      BuddhaPurnima: { month: 4, day: 12 },
      Muharram: { month: 6, day: 6 },
      DurgaAshtami: { month: 9, day: 1 },
      Dussehra: { month: 9, day: 2 },
      Diwali: { month: 9, day: 20 },
      GuruNanakJayanti: { month: 10, day: 5 },
    },
    2026: {
      Holi: { month: 2, day: 3 },
      GoodFriday: { month: 3, day: 3 },
      BuddhaPurnima: { month: 4, day: 2 },
      Muharram: { month: 5, day: 27 },
      DurgaAshtami: { month: 9, day: 20 },
      Dussehra: { month: 9, day: 21 },
      Diwali: { month: 10, day: 8 },
      GuruNanakJayanti: { month: 10, day: 24 },
    },
  }

  // Get variable holidays for the year, or use default approximations
  // If year not found, use closest year or calculate approximate dates
  let yearHolidays = variableHolidays[year]
  if (!yearHolidays) {
    // Use closest year's dates as approximation
    const availableYears = Object.keys(variableHolidays).map(Number).sort()
    const closestYear = availableYears.reduce((prev, curr) => 
      Math.abs(curr - year) < Math.abs(prev - year) ? curr : prev
    )
    yearHolidays = variableHolidays[closestYear] || variableHolidays[2024]
  }
  
  holidays.push(
    { name: "Holi", date: new Date(year, yearHolidays.Holi.month, yearHolidays.Holi.day), isNational: true },
    { name: "Good Friday", date: new Date(year, yearHolidays.GoodFriday.month, yearHolidays.GoodFriday.day), isNational: true },
    { name: "Buddha Purnima", date: new Date(year, yearHolidays.BuddhaPurnima.month, yearHolidays.BuddhaPurnima.day), isNational: true },
    { name: "Muharram", date: new Date(year, yearHolidays.Muharram.month, yearHolidays.Muharram.day), isNational: true },
    { name: "Durga Ashtami", date: new Date(year, yearHolidays.DurgaAshtami.month, yearHolidays.DurgaAshtami.day), isNational: true },
    { name: "Dussehra", date: new Date(year, yearHolidays.Dussehra.month, yearHolidays.Dussehra.day), isNational: true },
    { name: "Diwali", date: new Date(year, yearHolidays.Diwali.month, yearHolidays.Diwali.day), isNational: true },
    { name: "Guru Nanak Jayanti", date: new Date(year, yearHolidays.GuruNanakJayanti.month, yearHolidays.GuruNanakJayanti.day), isNational: true }
  )

  return holidays
}

// Pre-populate Indian holidays for current and next year
async function populateIndianHolidays() {
  try {
    const currentYear = new Date().getFullYear()
    const nextYear = currentYear + 1
    
    // Check if holidays exist for current year
    const existingCount = await Holiday.countDocuments({
      date: {
        $gte: new Date(currentYear, 0, 1),
        $lt: new Date(nextYear + 1, 0, 1),
      },
    })

    if (existingCount === 0) {
      const holidays: Array<{ name: string; date: Date; isNational: boolean }> = []
      
      // Add holidays for current year
      holidays.push(...getIndianHolidayDates(currentYear))
      
      // Add holidays for next year
      holidays.push(...getIndianHolidayDates(nextYear))

      await Holiday.insertMany(holidays)
      console.log(`Indian holidays pre-populated for ${currentYear} and ${nextYear}`)
    } else {
      // Ensure next year holidays exist
      const nextYearHolidays = await Holiday.countDocuments({
        date: {
          $gte: new Date(nextYear, 0, 1),
          $lt: new Date(nextYear + 1, 0, 1),
        },
      })

      if (nextYearHolidays === 0) {
        const holidays = getIndianHolidayDates(nextYear)
        await Holiday.insertMany(holidays)
        console.log(`Indian holidays added for ${nextYear}`)
      }
    }
  } catch (error) {
    console.error("Error populating holidays:", error)
  }
}

// Call populate function when model is loaded
if (mongoose.connection.readyState === 1) {
  populateIndianHolidays()
} else {
  mongoose.connection.once("open", () => {
    populateIndianHolidays()
  })
}

export default Holiday

