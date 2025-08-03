"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, Clock, Activity } from "lucide-react"

interface TranscriptMessage {
  speaker: "user" | "ai"
  message: string
  timestamp: Date
}

interface LiveCall {
  callId: string
  fromNumber: string
  toNumber: string
  transcript: TranscriptMessage[]
  status: "active" | "completed"
  startTime: Date
}

interface Stats {
  daily: {
    calls: number
  }
  monthly: {
    calls: number
  }
  total: {
    calls: number
    appointments: number
    activeAppointments: number
    avgDuration: number
  }
}

export default function DashboardPage() {
  const [liveCall, setLiveCall] = useState<LiveCall | null>(null)
  const [stats, setStats] = useState<Stats | null>(null) // Stats are fetched but not displayed on this page
  const [loadingStats, setLoadingStats] = useState(true)
  const [activeCallDuration, setActiveCallDuration] = useState(0)

  useEffect(() => {
    // Function to fetch stats (for other pages, not directly displayed here)
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/stats")
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error("Error fetching dashboard stats:", error)
      } finally {
        setLoadingStats(false)
      }
    }

    // Function to fetch live call
    const fetchLiveCall = async () => {
      try {
        const response = await fetch("/api/calls/live")
        if (response.ok) {
          const data = await response.json()
          setLiveCall(data)
        } else {
          setLiveCall(null) // No active call
        }
      } catch (error) {
        console.error("Error fetching live call:", error)
        setLiveCall(null)
      }
    }

    // Initial fetch
    fetchStats() // Fetches general stats, but they are not rendered on this dashboard page
    fetchLiveCall()

    // Set up polling for live call updates (e.g., every 3 seconds)
    const pollingInterval = setInterval(fetchLiveCall, 3000)

    return () => {
      clearInterval(pollingInterval)
    }
  }, [])

  useEffect(() => {
    let durationInterval: NodeJS.Timeout | null = null
    if (liveCall && liveCall.status === "active") {
      durationInterval = setInterval(() => {
        setActiveCallDuration(Math.floor((Date.now() - new Date(liveCall.startTime).getTime()) / 1000))
      }, 1000)
    } else {
      if (durationInterval) clearInterval(durationInterval)
      setActiveCallDuration(0)
    }
    return () => {
      if (durationInterval) clearInterval(durationInterval)
    }
  }, [liveCall])

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // The 'displayStats' variable is defined but not used for rendering on this page,
  // ensuring that general call statistics like 'Today's Calls' are not shown here.
  const displayStats = stats || {
    daily: { calls: 0 },
    monthly: { calls: 0 },
    total: { calls: 0, appointments: 0, activeAppointments: 0, avgDuration: 0 },
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Handle Your Calls with AI</h1>
        <p className="text-lg text-gray-600">Intelligent call management powered by Gemini AI</p>
      </div>

      {/* Live Call Transcript */}
      <Card className="col-span-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Live Call Transcript
            </CardTitle>
            {/* "call connected" status: Displays "Live" badge when call is active */}
            {liveCall && (
              <Badge variant={liveCall.status === "active" ? "default" : "secondary"}>
                {liveCall.status === "active" ? "Live" : "Completed"}
              </Badge>
            )}
          </div>
          {/* Incoming call number, time, and date */}
          {liveCall && (
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
              <div className="flex items-center gap-1">
                <span className="font-medium">From:</span>
                <span>{liveCall.fromNumber}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">To:</span>
                <span>{liveCall.toNumber}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">Started:</span>
                <span>{formatTime(liveCall.startTime)}</span>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {liveCall ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Transcript box: Displays user and AI messages */}
              {liveCall.transcript.map((message, index) => (
                <div key={index} className={`flex ${message.speaker === "ai" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.speaker === "ai" ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">
                        {message.speaker === "ai" ? "AI Assistant" : "Caller"}
                      </span>
                      <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
                    </div>
                    <p className="text-sm">{message.message}</p>
                  </div>
                </div>
              ))}
              {liveCall.status === "active" && (
                <div className="flex justify-start">
                  <div className="bg-blue-100 text-blue-900 px-4 py-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                      <span className="text-xs">AI is typing...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active calls at the moment</p>
              <p className="text-sm">Live transcripts will appear here when calls are in progress</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Call Duration Card: Below the transcript, centered, medium/small size */}
      <div className="flex justify-center">
        <Card className="w-full max-w-xs md:max-w-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Call Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {liveCall && liveCall.status === "active" ? formatDuration(activeCallDuration) : "0:00"}
            </div>
            <p className="text-xs text-muted-foreground">Current live call duration</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
