"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, PhoneCall, Activity } from "lucide-react"

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
    avgDuration: number // Still present in API, but not displayed here
  }
}

export default function DashboardPage() {
  const [liveCall, setLiveCall] = useState<LiveCall | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    // Fetch stats
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
    fetchStats()

    // WebSocket connection for real-time updates
    // NOTE: For production, you'll need a proper WebSocket server setup
    // that's accessible from your Vercel deployment (e.g., a separate service).
    // 'ws://localhost:8080' will only work locally.
    const ws = new WebSocket("ws://localhost:8080")

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === "transcript_update") {
        setLiveCall(data.transcript)
      }
    }

    return () => {
      ws.close()
    }
  }, [])

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loadingStats ? "..." : displayStats.daily.calls}</div>
            <p className="text-xs text-muted-foreground">Calls today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Calls</CardTitle>
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loadingStats ? "..." : displayStats.total.activeAppointments}</div>
            <p className="text-xs text-muted-foreground">Currently in progress (appointments)</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Call Transcript */}
      <Card className="col-span-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Live Call Transcript
            </CardTitle>
            {liveCall && (
              <Badge variant={liveCall.status === "active" ? "default" : "secondary"}>
                {liveCall.status === "active" ? "Live" : "Completed"}
              </Badge>
            )}
          </div>
          {liveCall && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
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
    </div>
  )
}
