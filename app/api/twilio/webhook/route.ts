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

// Helper function to format 24-hour time to 12-hour AM/PM
function formatTimeForDisplay(time: string): string {
  if (!time) return ""
  const [hours, minutes] = time.split(":")
  const hour = Number.parseInt(hours)
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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
        appointmentBooked: false, // Initialize new field
      })
      console.log(`DEBUG (twilio/webhook): New call started: ${callSid}`)

      twiml.say("Hello! Welcome to our medical assistant. How can I help you today?")
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
      // This block is specifically for Twilio's "Call Status Changes" webhook
      console.log(`DEBUG (twilio/webhook): Received CallStatus webhook for ${callSid}: ${callStatus}`)
      if (callTranscript.status === "active") { // Only update if it was previously active
        callTranscript.status = callStatus
        callTranscript.endTime = new Date()
        callTranscript.duration = Math.floor(
          (callTranscript.endTime.getTime() - callTranscript.startTime.getTime()) / 1000,
        )
        await callTranscript.save()
        console.log(
          `DEBUG (twilio/webhook): Call ${callSid} status updated to ${callTranscript.status}. Duration: ${callTranscript.duration}s`,
        )
      } else {
        console.log(`DEBUG (twilio/webhook): Call ${callSid} status already ${callTranscript.status}, no update needed.`)
      }
      // No TwiML needed here, as the call is already ending/ended
      return new NextResponse(twiml.toString(), {
        headers: { "Content-Type": "text/xml" },
      })
    } else if (speechResult) {
      // User spoke, process with AI
      console.log(`DEBUG (twilio/webhook): Processing speechResult: "${speechResult}"`)
      callTranscript.transcript.push({ speaker: "user", message: speechResult, timestamp: new Date() })
      await callTranscript.save() // Save user's message immediately
      console.log(`DEBUG (twilio/webhook): User message saved to DB.`)

      // --- Fetch available doctors and format for AI prompt ---
      const doctors = await Doctor.find({ isActive: true })
      const doctorInfo = doctors
        .map((doc) => {
          const slots = doc.availableSlots
            .map((slot) => `${slot.day} from ${formatTimeForDisplay(slot.startTime)} to ${formatTimeForDisplay(slot.endTime)}`)
            .join("; ")
          return `- Dr. ${doc.name} (${doc.specialization}): Available ${slots}`
        })
        .join("\n")

      const currentDate = new Date().toISOString().split("T")[0] // YYYY-MM-DD format

      // Construct conversation history for AI
      const conversationHistory = callTranscript.transcript
        .map((t) => `${t.speaker === "user" ? "User" : "Assistant"}: ${t.message}`) // Changed "AI" to "Assistant" for prompt
        .join("\n")

      // AI Prompt - Refined for natural conversation and data extraction
      let prompt = `You are a helpful medical assistant. Your goal is to assist users with their medical queries and book appointments.
        Current Date: ${currentDate}

        Available Doctors and their slots:
        ${doctorInfo || "No doctors currently available."}

        When discussing doctor availability, use natural language like "9 AM to 5 PM" instead of "09:00 to 17:00".

        If the user wants to book an appointment, you need to gather the following information:
        1. Preferred Doctor's Name (e.g., Dr. Hamza)
        2. Doctor's Specialization (e.g., Cardiologist)
        3. Desired Appointment Date (e.g., Tuesday, October 26th)
        4. Desired Appointment Time (e.g., 2 PM)
        5. Patient's Full Name
        6. Patient's Phone Number

        Ask for these details naturally. If you have some but not all, ask for the missing pieces.
        Once you have ALL these details, you MUST respond with the exact format:
        "BOOK_APPOINTMENT:DoctorName:Specialization:Date(YYYY-MM-DD):Time(HH:MM):PatientName:PatientPhone"
        - Ensure DoctorName and Specialization exactly match one of the available doctors.
        - Ensure Date is in YYYY-MM-DD format and Time is in HH:MM (24-hour) format.
        - Only book if the requested date and time fall within the doctor's available slots.
        - If a requested slot is unavailable, suggest available options or ask for a different time/day.

        If the user explicitly says "no", "nothing else", "that's all", "goodbye", or similar phrases indicating they want to end the call, you MUST respond with the exact format:
        "END_CALL:Polite closing message here." (e.g., "END_CALL:Thank you for calling, have a good day!")

        Otherwise, respond naturally to their query.

        Current conversation:
        ${conversationHistory}
        Assistant:` // Changed "AI" to "Assistant" for prompt

      // If appointment was just booked, guide AI to ask "anything else?"
      if (callTranscript.appointmentBooked) {
        prompt = `You are a helpful medical assistant. An appointment has just been booked.
            Your current task is to ask the user if there's anything else they need.
            If the user explicitly says "no", "nothing else", "that's all", "goodbye", or similar phrases indicating they want to end the call, you MUST respond with the exact format:
            "END_CALL:Polite closing message here." (e.g., "END_CALL:Thank you for calling, have a good day!")
            Otherwise, respond naturally to their new query.

            Current conversation:
            ${conversationHistory}
            Assistant:`
      }

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
      console.log(`DEBUG (twilio/webhook): AI message saved to DB.`)

      console.log("DEBUG (twilio/webhook): Checking for appointment match or end call command with AI response.")
      const appointmentMatch = aiResponse.match(/^BOOK_APPOINTMENT:(.+):(.+):(\d{4}-\d{2}-\d{2}):(\d{2}:\d{2}):(.+):(.+)$/)
      const endCallMatch = aiResponse.match(/^END_CALL:(.+)$/)

      if (appointmentMatch) {
        const [, doctorName, specialization, dateStr, timeStr, patientName, patientPhone] = appointmentMatch
        console.log(
          `DEBUG (twilio/webhook): Attempting to book appointment for Doctor: ${doctorName}, Specialization: ${specialization}, Date: ${dateStr}, Time: ${timeStr}, Patient: ${patientName}, Phone: ${patientPhone}`,
        )
        try {
          const doctor = await Doctor.findOne({ name: doctorName, specialization: specialization })

          if (doctor) {
            const requestedDate = new Date(dateStr)
            const requestedDay = requestedDate.toLocaleString("en-US", { weekday: "long" })
            const isSlotAvailable = doctor.availableSlots.some(
              (slot) => slot.day === requestedDay && timeStr >= slot.startTime && timeStr <= slot.endTime,
            )

            if (isSlotAvailable) {
              console.log("DEBUG (twilio/webhook): Doctor found and slot available, attempting to create appointment.")
              const newAppointment = await Appointment.create({
                patientName: patientName,
                patientPhone: patientPhone,
                doctorId: doctor._id,
                appointmentDate: requestedDate,
                appointmentTime: timeStr,
                status: "scheduled",
                notes: `Booked via AI call (CallSid: ${callSid})`,
                callId: callSid,
              })
              console.log(`DEBUG (twilio/webhook): Appointment created successfully: ${newAppointment._id}`)

              callTranscript.appointmentBooked = true; // Set flag after successful booking
              await callTranscript.save(); // Save the updated flag

              twiml.say(
                `Okay, I have booked an appointment for ${patientName} with ${doctor.name}, a ${doctor.specialization}, on ${requestedDate.toDateString()} at ${formatTimeForDisplay(timeStr)}.`,
              )
              // Do not hang up immediately, let the AI guide the next turn
              twiml.gather({
                input: "speech",
                timeout: 5,
                action: `/api/twilio/webhook?callSid=${callSid}`,
                method: "POST",
              })
            } else {
              console.log(
                `DEBUG (twilio/webhook): Requested slot not available for ${doctorName} on ${requestedDay} at ${timeStr}.`,
              )
              twiml.say(
                `I'm sorry, Dr. ${doctorName} is not available on ${requestedDay} at ${formatTimeForDisplay(timeStr)}. Please choose another time or day.`,
              )
              twiml.gather({
                input: "speech",
                timeout: 5,
                action: `/api/twilio/webhook?callSid=${callSid}`,
                method: "POST",
              })
            }
          } else {
            console.log(`DEBUG (twilio/webhook): Doctor not found: ${doctorName}, ${specialization}`)
            twiml.say(
              `I'm sorry, I couldn't find a doctor named ${doctorName} with specialization ${specialization}. Please try again or ask for a different doctor.`,
            )
            twiml.gather({
              input: "speech",
              timeout: 5,
              action: `/api/twilio/webhook?callSid=${callSid}`,
              method: "POST",
            })
          }
        } catch (bookingError) {
          console.error("DEBUG (twilio/webhook): Error during appointment booking logic:", bookingError)
          twiml.say("I apologize, there was an error booking your appointment. Please try again later.")
          twiml.gather({
            input: "speech",
            timeout: 5,
            action: `/api/twilio/webhook?callSid=${callSid}`,
            method: "POST",
          })
        }
      } else if (endCallMatch) {
        const closingMessage = endCallMatch[1];
        console.log(`DEBUG (twilio/webhook): AI requested to end call with message: "${closingMessage}"`);
        twiml.say(closingMessage);
        twiml.hangup(); // Hang up as requested by AI
      }
      else {
        // If AI response does not match booking format or end call format, just say the AI response
        twiml.say(aiResponse)
        twiml.gather({
          input: "speech",
          timeout: 5,
          action: `/api/twilio/webhook?callSid=${callSid}`,
          method: "POST",
        })
      }
    } else {
      // No speech detected or other unhandled scenario, re-gather
      console.log("DEBUG (twilio/webhook): No speech result received, re-gathering.")
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
    twiml.hangup() // Hang up on general errors to prevent infinite loops
  }

  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  })
}
