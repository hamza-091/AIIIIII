import mongoose from "mongoose"

const AppointmentSchema = new mongoose.Schema(
  {
    patientName: {
      type: String,
      required: true,
    },
    patientPhone: {
      type: String,
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    appointmentDate: {
      type: Date,
      required: true,
    },
    appointmentTime: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "no-show"],
      default: "scheduled",
    },
    notes: {
      type: String,
      default: "",
    },
    callId: {
      type: String, // Reference to the call that booked this appointment
    },
  },
  {
    timestamps: true,
  },
)

export default mongoose.models.Appointment || mongoose.model("Appointment", AppointmentSchema)
