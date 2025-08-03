import mongoose from "mongoose"
import Doctor from "../lib/models/Doctor.js" // Adjust path if necessary
import dbConnect from "../lib/mongodb.js" // Adjust path if necessary

async function seedDoctors() {
  await dbConnect()

  const doctorsCount = await Doctor.countDocuments()

  if (doctorsCount === 0) {
    console.log("No doctors found. Seeding initial doctors...")

    const doctorsToSeed = [
      {
        name: "Dr. Aisha Khan",
        specialization: "Pediatrician",
        availableSlots: [
          { day: "Monday", startTime: "09:00", endTime: "17:00" },
          { day: "Wednesday", startTime: "09:00", endTime: "17:00" },
          { day: "Friday", startTime: "09:00", endTime: "15:00" },
        ],
        isActive: true,
      },
      {
        name: "Dr. Bilal Ahmed",
        specialization: "Cardiologist",
        availableSlots: [
          { day: "Tuesday", startTime: "10:00", endTime: "18:00" },
          { day: "Thursday", startTime: "10:00", endTime: "18:00" },
          { day: "Saturday", startTime: "09:00", endTime: "13:00" },
        ],
        isActive: true,
      },
    ]

    try {
      await Doctor.insertMany(doctorsToSeed)
      console.log("Successfully seeded 2 doctors.")
    } catch (error) {
      console.error("Error seeding doctors:", error)
    }
  } else {
    console.log(`Doctors already exist (${doctorsCount}). Skipping seeding.`)
  }

  mongoose.connection.close()
}

seedDoctors().catch(console.error)
