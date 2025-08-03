"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Phone, Clock, ChevronDown, ChevronUp, Calendar, User, Bot } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface CallRecord {
  _id: string
  callId: string
  fromNumber: string
  toNumber: string
  transcript: Array<{
    speaker: "user" | "ai"
    message: string
    timestamp: Date
  }>
  duration: number
  status: "active" | "completed" | "failed"
  startTime: Date
  endTime?: Date
}

export default function CallHistoryPage() {
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCalls, setExpandedCalls] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchCalls()
  }, [])

  const fetchCalls = async () => {
    try {
      const response = await fetch("/api/calls")
      const data = await response.json()
      setCalls(data.calls || [])
    } catch (error) {
      console.error("Error fetching calls:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (callId: string) => {
    const newExpanded = new Set(expandedCalls)
    if (newExpanded.has(callId)) {
      newExpanded.delete(callId)
    } else {
      newExpanded.add(callId)
    }
    setExpandedCalls(newExpanded)
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const displayCalls = calls

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Call History</h1>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Phone className="h-4 w-4" />
          <span>{displayCalls.length} total calls</span>
        </div>
      </div>

      <div className="space-y-4">
        {displayCalls.map((call) => (
          <Card key={call._id} className="overflow-hidden">
            <Collapsible>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Phone className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Call from {call.fromNumber}</CardTitle>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDateTime(call.startTime)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDuration(call.duration)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          call.status === "completed"
                            ? "default"
                            : call.status === "active"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {call.status}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => toggleExpanded(call._id)}>
                        {expandedCalls.has(call._id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      Call Transcript
                    </h4>
                    <div className="space-y-3 max-h-96 overflow-y-auto bg-gray-50 p-4 rounded-lg">
                      {call.transcript.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${message.speaker === "ai" ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                              message.speaker === "ai"
                                ? "bg-blue-100 text-blue-900"
                                : "bg-white text-gray-900 shadow-sm"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {message.speaker === "ai" ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                              <span className="text-xs font-medium">
                                {message.speaker === "ai" ? "AI Assistant" : "Caller"}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm">{message.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {displayCalls.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Phone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No calls yet</h3>
            <p className="text-gray-600">Call history will appear here once you start receiving calls.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
