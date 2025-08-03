import mongoose from "mongoose"

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function dbConnect() {
  const MONGODB_URI = process.env.MONGODB_URI

  console.log("DEBUG (inside dbConnect): MONGODB_URI as seen by app:", MONGODB_URI ? "DEFINED" : "UNDEFINED")

  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not defined. Cannot connect to database.")
    throw new Error(
      "Database connection string is missing. Please ensure MONGODB_URI is set in your environment variables.",
    )
  }

  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
    }

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log("MongoDB connected successfully!") // Log success
        return mongoose
      })
      .catch((error) => {
        console.error("MongoDB connection error:", error) // Log connection error
        cached.promise = null // Reset promise on failure
        throw error // Re-throw the error after logging
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

export default dbConnect
