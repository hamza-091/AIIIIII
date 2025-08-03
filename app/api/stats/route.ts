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

    // Average call duration
    const avgDurationResult = await CallTranscript.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, avgDuration: { $avg: "$duration" } } },
    ])

    const avgDuration = avgDurationResult[0]?.avgDuration || 0

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
        avgDuration: Math.round(avgDuration),
      },
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
