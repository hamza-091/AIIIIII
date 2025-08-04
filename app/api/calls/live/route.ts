import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import CallTranscript from "@/lib/models/CallTranscript"

export async function GET() {
  try {
    await dbConnect()

    // Find the most recent active call by explicitly filtering for status: "active"
    const liveCall = await CallTranscript.findOne({ status: "active" }).sort({ startTime: -1 })

    if (!liveCall) {
      console.log("DEBUG: No active call found, returning null.")
      return NextResponse.json(null, { status: 200 })
    }

    console.log(`DEBUG: Found active call: ${liveCall.callId}, Status: ${liveCall.status}`)
    return NextResponse.json(liveCall)
  } catch (error) {
    console.error("Error fetching live call:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
