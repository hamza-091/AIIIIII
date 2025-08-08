import mongoose from "mongoose"

const CallTranscriptSchema = new mongoose.Schema(
{
  callId: {
    type: String,
    required: true,
    unique: true,
  },
  fromNumber: {
    type: String,
    required: true,
  },
  toNumber: {
    type: String,
    required: true,
  },
  transcript: [
    {
      speaker: {
        type: String,
        enum: ["user", "ai"],
        required: true,
      },
      message: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  duration: {
    type: Number, // in seconds
    default: 0,
  },
  status: {
    type: String,
    enum: ["active", "completed", "failed"],
    default: "active",
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
  },
  appointmentBooked: { // NEW FIELD
    type: Boolean,
    default: false,
  },
},
{
  timestamps: true,
},
)

export default mongoose.models.CallTranscript || mongoose.model("CallTranscript", CallTranscriptSchema)
