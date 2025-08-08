import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import CallTranscript from "@/lib/models/CallTranscript"

export async function GET() {
  try {
    await dbConnect()

    // Find the most recent active call
    let liveCall = await CallTranscript.findOne({ status: "active" }).sort({ startTime: -1 })

    // If an active call is found, check its age.
    // If it's older than, say, 1 hour (3600 seconds), assume it's stale and mark it as failed.
    // This acts as a cleanup mechanism if Twilio's status webhook was missed.
    if (liveCall) {
      const now = new Date()
      const callStartTime = new Date(liveCall.startTime)
      const durationInSeconds = Math.floor((now.getTime() - callStartTime.getTime()) / 1000)
      const STALE_CALL_THRESHOLD_SECONDS = 3600; // 1 hour

      if (durationInSeconds > STALE_CALL_THRESHOLD_SECONDS) {
        console.log(`DEBUG (api/calls/live): Found stale active call ${liveCall.callId}. Marking as failed.`)
        liveCall.status = "failed"
        liveCall.endTime = now
        liveCall.duration = durationInSeconds
        await liveCall.save()
        liveCall = null; // Set to null so the dashboard doesn't display it as live
      }
    }

    if (!liveCall) {
      console.log("DEBUG (api/calls/live): No active call found, returning null.")
      return NextResponse.json(null, { status: 200 })
    }

    console.log(`DEBUG (api/calls/live): Found active call: ${liveCall.callId}, Status: ${liveCall.status}`)
    return NextResponse.json(liveCall)
  } catch (error) {
    console.error("Error fetching live call:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
