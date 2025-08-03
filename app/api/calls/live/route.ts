import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import CallTranscript from "@/lib/models/CallTranscript"

export async function GET() {
  try {
    await dbConnect()

    // Find the most recent active call
    const liveCall = await CallTranscript.findOne({ status: "active" }).sort({ startTime: -1 })

    if (!liveCall) {
      return NextResponse.json(null, { status: 200 })
    }

    return NextResponse.json(liveCall)
  } catch (error) {
    console.error("Error fetching live call:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
