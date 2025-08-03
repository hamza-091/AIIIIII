import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import CallTranscript from "@/lib/models/CallTranscript"
import Appointment from "@/lib/models/Appointment"

export async function GET() {
  try {
    await dbConnect()

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Daily stats
    const dailyCalls = await CallTranscript.countDocuments({
      createdAt: { $gte: startOfDay },
    })

    // Monthly stats
    const monthlyCalls = await CallTranscript.countDocuments({
      createdAt: { $gte: startOfMonth },
    })

    // Total stats
    const totalCalls = await CallTranscript.countDocuments()
    const totalAppointments = await Appointment.countDocuments()
    const activeAppointments = await Appointment.countDocuments({
      status: "scheduled",
    })

    // Removed avgDuration calculation as it's no longer displayed on frontend

    return NextResponse.json({
      daily: {
        calls: dailyCalls,
      },
      monthly: {
        calls: monthlyCalls,
      },
      total: {
        calls: totalCalls,
        appointments: totalAppointments,
        activeAppointments,
        avgDuration: 0, // Set to 0 or remove if not needed at all in the response
      },
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
