import { type NextRequest, NextResponse } from "next/server"
import { VoiceResponse } from "twilio/lib/twiml/VoiceResponse"
import { GoogleGenerativeAI } from "@google/generative-ai"
import dbConnect from "@/lib/mongodb"
import CallTranscript from "@/lib/models/CallTranscript"
import Doctor from "@/lib/models/Doctor"
import Appointment from "@/lib/models/Appointment"

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")
const model = genAI.getGenerativeModel({ model: "gemini-pro" }) // Using gemini-pro for text-only

export async function POST(request: NextRequest) {
  await dbConnect()

  const twiml = new VoiceResponse()
  const body = new URLSearchParams(await request.text())

  const callSid = body.get("CallSid")
  const speechResult = body.get("SpeechResult")
  const callStatus = body.get("CallStatus")
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
      console.log(`New call started: ${callSid}`)

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
      console.log(`Call ${callSid} ended with status: ${callStatus}`)
      return new NextResponse(twiml.toString(), {
        headers: { "Content-Type": "text/xml" },
      })
    } else if (speechResult) {
      // User spoke, process with AI
      callTranscript.transcript.push({ speaker: "user", message: speechResult, timestamp: new Date() })
      await callTranscript.save()
      console.log(`User said: ${speechResult}`)

      // Construct conversation history for AI
      const conversationHistory = callTranscript.transcript
        .map((t) => `${t.speaker === "user" ? "User" : "AI"}: ${t.message}`)
        .join("\n")

      // AI Prompt - Instruct AI to identify appointment booking intent
      const prompt = `You are an AI medical assistant. Your goal is to help users with their medical queries and book appointments.
      If the user asks to book an appointment, respond with the exact format:
      "BOOK_APPOINTMENT:DoctorName:Specialization:Date(YYYY-MM-DD):Time(HH:MM)"
      For example: "BOOK_APPOINTMENT:Dr. Smith:Cardiologist:2025-10-26:14:00"
      If you cannot determine all details, ask for clarification.
      Otherwise, respond naturally to their query.

      Current conversation:
      ${conversationHistory}
      AI:`

      const result = await model.generateContent(prompt)
      const aiResponse = result.response.text()
      console.log(`AI responded: ${aiResponse}`)

      callTranscript.transcript.push({ speaker: "ai", message: aiResponse, timestamp: new Date() })

      // Check for appointment booking intent
      const appointmentMatch = aiResponse.match(/^BOOK_APPOINTMENT:(.+):(.+):(\d{4}-\d{2}-\d{2}):(\d{2}:\d{2})$/)

      if (appointmentMatch) {
        const [, doctorName, specialization, dateStr, timeStr] = appointmentMatch
        try {
          const doctor = await Doctor.findOne({ name: doctorName, specialization: specialization })

          if (doctor) {
            const appointmentDate = new Date(dateStr)
            const newAppointment = await Appointment.create({
              patientName: "Caller", // Placeholder, ideally get from user or Twilio
              patientPhone: fromNumber,
              doctorId: doctor._id,
              appointmentDate: appointmentDate,
              appointmentTime: timeStr,
              status: "scheduled",
              notes: `Booked via AI call (CallSid: ${callSid})`,
              callId: callSid,
            })
            twiml.say(
              `Okay, I have booked an appointment for you with ${doctor.name}, a ${doctor.specialization}, on ${appointmentDate.toDateString()} at ${timeStr}. Is there anything else I can help you with?`,
            )
          } else {
            twiml.say(
              `I'm sorry, I couldn't find a doctor named ${doctorName} with specialization ${specialization}. Please try again or ask for a different doctor.`,
            )
          }
        } catch (error) {
          console.error("Error booking appointment:", error)
          twiml.say("I apologize, there was an error booking your appointment. Please try again later.")
        }
      } else {
        twiml.say(aiResponse)
      }

      await callTranscript.save()

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
    console.error("Error in Twilio webhook:", error)
    twiml.say("I apologize, an error occurred. Please try again later.")
  }

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  })
}
