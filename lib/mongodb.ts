import mongoose from "mongoose"

// Lazy check - only validate when connectDB is called, not at module load
function getMongoDBUri(): string {
  if (!process.env.MONGODB_URI) {
    throw new Error("Please add your MONGODB_URI to .env.local or .env file")
  }
  return process.env.MONGODB_URI
}

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

declare global {
  var mongoose: MongooseCache | undefined
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null }

if (!global.mongoose) {
  global.mongoose = cached
}

async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
    }

    const mongoUri = getMongoDBUri()
    cached.promise = mongoose
      .connect(mongoUri, opts)
      .then((mongoose) => {
        console.log("MongoDB connected successfully")
        return mongoose
      })
      .catch((error) => {
        console.error("MongoDB connection error:", error)
        cached.promise = null
        throw error
      })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

// Handle connection events
if (mongoose.connection.readyState === 0) {
  mongoose.connection.on("connected", () => {
    console.log("Mongoose connected to MongoDB")
  })

  mongoose.connection.on("error", (err) => {
    console.error("Mongoose connection error:", err)
  })

  mongoose.connection.on("disconnected", () => {
    console.log("Mongoose disconnected from MongoDB")
  })

  // Graceful shutdown
  process.on("SIGINT", async () => {
    await mongoose.connection.close()
    console.log("MongoDB connection closed through app termination")
    process.exit(0)
  })
}

export default connectDB

