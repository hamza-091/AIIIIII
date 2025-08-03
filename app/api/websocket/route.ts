import type { NextRequest } from "next/server"
import { WebSocketServer } from "ws"

let wss: WebSocketServer | null = null

export async function GET(request: NextRequest) {
  if (!wss) {
    wss = new WebSocketServer({ port: 8080 })

    wss.on("connection", (ws) => {
      console.log("Client connected to WebSocket")

      ws.on("message", (message) => {
        console.log("Received:", message.toString())
      })

      ws.on("close", () => {
        console.log("Client disconnected from WebSocket")
      })
    })
  }

  return new Response("WebSocket server running on port 8080", { status: 200 })
}

export function broadcastTranscript(callId: string, transcript: any) {
  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        // WebSocket.OPEN
        client.send(
          JSON.stringify({
            type: "transcript_update",
            callId,
            transcript,
          }),
        )
      }
    })
  }
}
