"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, Clock, Calendar, TrendingUp, User, Bot, Info } from "lucide-react"

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

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/stats")
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const displayStats = stats || {
    daily: { calls: 0 },
    monthly: { calls: 0 },
    total: { calls: 0, appointments: 0, activeAppointments: 0, avgDuration: 0 },
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Statistics & Analytics</h1>

      {/* Call Statistics */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Call Analytics</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Calls</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayStats.daily.calls}</div>
              <p className="text-xs text-muted-foreground">Calls today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayStats.monthly.calls}</div>
              <p className="text-xs text-muted-foreground">Calls this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayStats.total.calls.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Appointment Statistics */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Appointment Analytics</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayStats.total.appointments}</div>
              <p className="text-xs text-muted-foreground">Booked via calls</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Appointments</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayStats.total.activeAppointments}</div>
              <p className="text-xs text-muted-foreground">Currently scheduled</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Project Information */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Project Information</h2>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              VoiceFlow AI System
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-700">Twilio Phone Number</h4>
                  <p className="text-lg font-mono bg-gray-100 px-3 py-1 rounded">+12187723284</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700">Project Developer</h4>
                  <p className="text-gray-600">Hamza</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700">AI Model</h4>
                  <p className="text-gray-600">Google Gemini API (Free Tier)</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-700">System Status</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 font-medium">Online</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700">Deployment</h4>
                  <p className="text-gray-600">Vercel Platform</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700">Database</h4>
                  <p className="text-gray-600">MongoDB Cloud</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium text-gray-700 mb-2">About This Project</h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                VoiceFlow AI is an intelligent call handling system that uses advanced AI to manage incoming calls, book
                appointments, and provide customer service. The system integrates with Twilio for voice communication
                and uses Google's Gemini AI for natural language processing. All conversations are transcribed in
                real-time and stored for analysis and quality assurance.
              </p>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium text-gray-700 mb-2">Key Features</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Bot className="h-3 w-3" />
                  <span>AI-powered call handling</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <span>Automated appointment booking</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  <span>Real-time call transcription</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3" />
                  <span>Doctor management system</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
