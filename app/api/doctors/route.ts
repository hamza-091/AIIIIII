import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Doctor from "@/lib/models/Doctor"

export async function GET() {
  try {
    await dbConnect()

    const doctors = await Doctor.find({ isActive: true })
    return NextResponse.json(doctors)
  } catch (error) {
    console.error("Error fetching doctors:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const data = await request.json()
    const doctor = await Doctor.create(data)

    return NextResponse.json(doctor, { status: 201 })
  } catch (error) {
    console.error("Error creating doctor:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
