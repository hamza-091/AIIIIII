import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/mongodb"
import User from "@/lib/models/User"
import { comparePassword, generateToken, hashPassword } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const { username, password } = await request.json()

    // Check if user exists
    let user = await User.findOne({ username })

    // If no users exist, create default admin user
    if (!user && username === "admin") {
      const hashedPassword = await hashPassword("admin")
      user = await User.create({
        username: "admin",
        password: hashedPassword,
        role: "admin",
      })
    }

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Generate token
    const token = generateToken(user._id.toString())

    // Set cookie
    const response = NextResponse.json({
      success: true,
      user: { id: user._id, username: user.username, role: user.role },
    })

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
