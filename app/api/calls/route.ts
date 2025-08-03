import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import CallTranscript from "@/lib/models/CallTranscript"

export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const skip = (page - 1) * limit

    const calls = await CallTranscript.find().sort({ createdAt: -1 }).skip(skip).limit(limit)

    const total = await CallTranscript.countDocuments()

    return NextResponse.json({
      calls,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching calls:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const data = await request.json()
    const call = await CallTranscript.create(data)

    return NextResponse.json(call, { status: 201 })
  } catch (error) {
    console.error("Error creating call:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
