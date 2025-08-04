import { type NextRequest, NextResponse } from "next/server"
import twilio from "twilio"
import { GoogleGenerativeAI } from "@google/generative-ai"
import dbConnect from "@/lib/mongodb"
import CallTranscript from "@/lib/models/CallTranscript"
import Doctor from "@/lib/models/Doctor"
import Appointment from "@/lib/models/Appointment"

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) // Using gemini-1.5-flash for text-only

export async function POST(request: NextRequest) {
  await dbConnect()

  const twiml = new twilio.twiml.VoiceResponse()
  const body = new URLSearchParams(await request.text())

  // Log all incoming Twilio parameters for debugging
  console.log("DEBUG (twilio/webhook): Incoming Twilio Webhook Body:")
  for (const [key, value] of body.entries()) {
    console.log(`  ${key}: ${value}`)
  }

  const callSid = body.get("CallSid")
  const speechResult = body.get("SpeechResult")
  const callStatus = body.get("CallStatus") // Get the current call status from Twilio
  const fromNumber = body.get("From")
  const toNumber = body.get("To")

  if (!callSid) {
    console.error("CallSid is missing from Twilio request.")
    return new NextResponse("CallSid missing", { status: 400 })
  }

  let callTranscript = await CallTranscript.findOne({ callId: callSid })

  try {
    if (!callTranscript) {
      // New call initiated
      callTranscript = await CallTranscript.create({
        callId: callSid,
        fromNumber: fromNumber,
        toNumber: toNumber,
        status: "active",
        startTime: new Date(),
        transcript: [],
      })
      console.log(`DEBUG (twilio/webhook): New call started: ${callSid}`)

      twiml.say("Hello! Welcome to our AI medical assistant. How can I help you today?")
      twiml.gather({
        input: "speech",
        timeout: 5,
        action: `/api/twilio/webhook?callSid=${callSid}`,
        method: "POST",
      })
    } else if (
      callStatus === "completed" ||
      callStatus === "busy" ||
      callStatus === "failed" ||
      callStatus === "no-answer"
    ) {
      // Call ended
      callTranscript.status = callStatus
      callTranscript.endTime = new Date()
      callTranscript.duration = Math.floor(
        (callTranscript.endTime.getTime() - callTranscript.startTime.getTime()) / 1000,
      )
      await callTranscript.save()
      console.log(
        `DEBUG (twilio/webhook): Call ${callSid} status updated to ${callTranscript.status}. Duration: ${callTranscript.duration}s`,
      )
      return new NextResponse(twiml.toString(), {
        headers: { "Content-Type": "text/xml" },
      })
    } else if (speechResult) {
      // User spoke, process with AI
      callTranscript.transcript.push({ speaker: "user", message: speechResult, timestamp: new Date() })
      await callTranscript.save() // Save user's message immediately
      console.log(`DEBUG (twilio/webhook): User said: ${speechResult}`)

      // --- Fetch available doctors and format for AI prompt ---
      const doctors = await Doctor.find({ isActive: true })
      const doctorInfo = doctors
        .map((doc) => {
          const slots = doc.availableSlots
            .map((slot) => `${slot.day} from ${slot.startTime} to ${slot.endTime}`)
            .join("; ")
          return `- Dr. ${doc.name} (${doc.specialization}): Available ${slots}`
        })
        .join("\n")

      const currentDate = new Date().toISOString().split("T")[0] // YYYY-MM-DD format

      // Construct conversation history for AI
      const conversationHistory = callTranscript.transcript
        .map((t) => `${t.speaker === "user" ? "User" : "AI"}: ${t.message}`)
        .join("\n")

      // AI Prompt - Instruct AI to identify appointment booking intent
      const prompt = `You are an AI medical assistant. Your goal is to help users with their medical queries and book appointments.
      Current Date: ${currentDate}

      Available Doctors and their slots:
      ${doctorInfo || "No doctors currently available."}

      If the user asks to book an appointment, you MUST respond with the exact format:
      "BOOK_APPOINTMENT:DoctorName:Specialization:Date(YYYY-MM-DD):Time(HH:MM)"
      - Ensure the DoctorName and Specialization exactly match one of the available doctors.
      - Ensure the Date is in YYYY-MM-DD format and Time is in HH:MM (24-hour) format.
      - Only book if the requested date and time fall within the doctor's available slots.
      - If you cannot determine all details (Doctor, Specialization, Date, Time), or if the requested slot is unavailable, you MUST ask for clarification or suggest available options.
      - If the user asks for a date like "tomorrow", convert it to the actual YYYY-MM-DD based on the Current Date.

      Otherwise, respond naturally to their query.

      Current conversation:
      ${conversationHistory}
      AI:`

      console.log("DEBUG (twilio/webhook): Sending prompt to Gemini AI.")
      let aiResponse: string
      try {
        const result = await model.generateContent(prompt)
        aiResponse = result.response.text()
        console.log("DEBUG (twilio/webhook): Raw AI response from Gemini:", aiResponse)
      } catch (aiError) {
        console.error("DEBUG (twilio/webhook): Error generating content from Gemini AI:", aiError)
        aiResponse = "I apologize, I'm having trouble processing your request at the moment. Please try again."
      }

      callTranscript.transcript.push({ speaker: "ai", message: aiResponse, timestamp: new Date() })
      await callTranscript.save() // Save AI's message immediately

      console.log("DEBUG (twilio/webhook): Checking for appointment match with AI response.")
      const appointmentMatch = aiResponse.match(/^BOOK_APPOINTMENT:(.+):(.+):(\d{4}-\d{2}-\d{2}):(\d{2}:\d{2})$/)

      if (appointmentMatch) {
        const [, doctorName, specialization, dateStr, timeStr] = appointmentMatch
        console.log(
          `DEBUG (twilio/webhook): Attempting to book appointment for Doctor: ${doctorName}, Specialization: ${specialization}, Date: ${dateStr}, Time: ${timeStr}`,
        )
        try {
          const doctor = await Doctor.findOne({ name: doctorName, specialization: specialization })

          if (doctor) {
            // Basic slot validation (can be expanded for more robust checks)
            const requestedDate = new Date(dateStr)
            const requestedDay = requestedDate.toLocaleString("en-US", { weekday: "long" })
            const isSlotAvailable = doctor.availableSlots.some(
              (slot) => slot.day === requestedDay && timeStr >= slot.startTime && timeStr <= slot.endTime,
            )

            if (isSlotAvailable) {
              console.log("DEBUG (twilio/webhook): Doctor found and slot available, attempting to create appointment.")
              const newAppointment = await Appointment.create({
                patientName: "Caller", // Placeholder, ideally get from user or Twilio
                patientPhone: fromNumber,
                doctorId: doctor._id,
                appointmentDate: requestedDate,
                appointmentTime: timeStr,
                status: "scheduled",
                notes: `Booked via AI call (CallSid: ${callSid})`,
                callId: callSid,
              })
              twiml.say(
                `Okay, I have booked an appointment for you with ${doctor.name}, a ${doctor.specialization}, on ${requestedDate.toDateString()} at ${timeStr}. Is there anything else I can help you with?`,
              )
            } else {
              console.log(
                `DEBUG (twilio/webhook): Requested slot not available for ${doctorName} on ${requestedDay} at ${timeStr}.`,
              )
              twiml.say(
                `I'm sorry, Dr. ${doctorName} is not available on ${requestedDay} at ${timeStr}. Please choose another time or day.`,
              )
            }
          } else {
            console.log(`DEBUG (twilio/webhook): Doctor not found: ${doctorName}, ${specialization}`)
            twiml.say(
              `I'm sorry, I couldn't find a doctor named ${doctorName} with specialization ${specialization}. Please try again or ask for a different doctor.`,
            )
          }
        } catch (bookingError) {
          console.error("DEBUG (twilio/webhook): Error during appointment booking logic:", bookingError)
          twiml.say("I apologize, there was an error booking your appointment. Please try again later.")
        }
      } else {
        // If AI response does not match booking format, just say the AI response
        twiml.say(aiResponse)
      }

      twiml.gather({
        input: "speech",
        timeout: 5,
        action: `/api/twilio/webhook?callSid=${callSid}`,
        method: "POST",
      })
    } else {
      // No speech detected or other unhandled scenario, re-gather
      twiml.say("I didn't catch that. Could you please repeat?")
      twiml.gather({
        input: "speech",
        timeout: 5,
        action: `/api/twilio/webhook?callSid=${callSid}`,
        method: "POST",
      })
    }
  } catch (error) {
    console.error("DEBUG (twilio/webhook): General error in Twilio webhook processing:", error)
    twiml.say("I apologize, an error occurred. Please try again later.")
  }

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  })
}
