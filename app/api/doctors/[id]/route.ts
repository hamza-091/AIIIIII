import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import Doctor from "@/lib/models/Doctor"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect()

    const { id } = params

    const deletedDoctor = await Doctor.findByIdAndDelete(id)

    if (!deletedDoctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Doctor deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting doctor:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
