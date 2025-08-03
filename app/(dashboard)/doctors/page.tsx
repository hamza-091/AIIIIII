"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { User, Clock, Calendar, Stethoscope, Plus, Trash2, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Doctor {
  _id: string
  name: string
  specialization: string
  availableSlots: Array<{
    day: string
    startTime: string
    endTime: string
  }>
  isActive: boolean
}

interface AvailableSlot {
  day: string
  startTime: string
  endTime: string
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [newDoctorName, setNewDoctorName] = useState("")
  const [newDoctorSpecialization, setNewDoctorSpecialization] = useState("")
  const [newDoctorSlots, setNewDoctorSlots] = useState<AvailableSlot[]>([{ day: "", startTime: "", endTime: "" }])
  const [isAddingDoctor, setIsAddingDoctor] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchDoctors()
  }, [])

  const fetchDoctors = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/doctors")
      const data = await response.json()
      setDoctors(data || [])
    } catch (error) {
      console.error("Error fetching doctors:", error)
      toast({
        title: "Error",
        description: "Failed to fetch doctors.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddSlot = () => {
    setNewDoctorSlots([...newDoctorSlots, { day: "", startTime: "", endTime: "" }])
  }

  const handleRemoveSlot = (index: number) => {
    const updatedSlots = newDoctorSlots.filter((_, i) => i !== index)
    setNewDoctorSlots(updatedSlots)
  }

  const handleSlotChange = (index: number, field: keyof AvailableSlot, value: string) => {
    const updatedSlots = newDoctorSlots.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot))
    setNewDoctorSlots(updatedSlots)
  }

  const handleAddDoctor = async () => {
    if (!newDoctorName || !newDoctorSpecialization) {
      toast({
        title: "Validation Error",
        description: "Please fill in doctor's name and specialization.",
        variant: "destructive",
      })
      return
    }

    // Validate slots
    const invalidSlots = newDoctorSlots.some((slot) => !slot.day || !slot.startTime || !slot.endTime)
    if (invalidSlots) {
      toast({
        title: "Validation Error",
        description: "Please ensure all available slots have a day, start time, and end time.",
        variant: "destructive",
      })
      return
    }

    setIsAddingDoctor(true)
    try {
      const response = await fetch("/api/doctors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newDoctorName,
          specialization: newDoctorSpecialization,
          availableSlots: newDoctorSlots,
          isActive: true,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Doctor added successfully!",
        })
        setNewDoctorName("")
        setNewDoctorSpecialization("")
        setNewDoctorSlots([{ day: "", startTime: "", endTime: "" }]) // Reset slots
        setIsDialogOpen(false) // Close dialog
        fetchDoctors()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to add doctor.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding doctor:", error)
      toast({
        title: "Error",
        description: "Network error. Failed to add doctor.",
        variant: "destructive",
      })
    } finally {
      setIsAddingDoctor(false)
    }
  }

  const handleDeleteDoctor = async (id: string) => {
    if (!confirm("Are you sure you want to delete this doctor?")) {
      return
    }

    try {
      const response = await fetch(`/api/doctors/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Doctor deleted successfully!",
        })
        fetchDoctors()
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to delete doctor.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting doctor:", error)
      toast({
        title: "Error",
        description: "Network error. Failed to delete doctor.",
        variant: "destructive",
      })
    }
  }

  const formatTime = (time: string) => {
    if (!time) return ""
    const [hours, minutes] = time.split(":")
    const hour = Number.parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
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
        <h1 className="text-3xl font-bold text-gray-900">Doctors</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Doctor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Doctor</DialogTitle>
              <DialogDescription>Enter the details for the new doctor, including their availability.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newDoctorName}
                  onChange={(e) => setNewDoctorName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="specialization" className="text-right">
                  Specialization
                </Label>
                <Input
                  id="specialization"
                  value={newDoctorSpecialization}
                  onChange={(e) => setNewDoctorSpecialization(e.target.value)}
                  className="col-span-3"
                />
              </div>

              <div className="col-span-4 mt-4">
                <h3 className="text-lg font-medium mb-2">Available Slots</h3>
                {newDoctorSlots.map((slot, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center mb-2">
                    <Label htmlFor={`day-${index}`} className="sr-only">
                      Day
                    </Label>
                    <Select value={slot.day} onValueChange={(value) => handleSlotChange(index, "day", value)}>
                      <SelectTrigger id={`day-${index}`} className="col-span-1">
                        <SelectValue placeholder="Select Day" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day} value={day}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Label htmlFor={`start-time-${index}`} className="sr-only">
                      Start Time
                    </Label>
                    <Input
                      id={`start-time-${index}`}
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => handleSlotChange(index, "startTime", e.target.value)}
                      className="col-span-1"
                    />
                    <Label htmlFor={`end-time-${index}`} className="sr-only">
                      End Time
                    </Label>
                    <Input
                      id={`end-time-${index}`}
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => handleSlotChange(index, "endTime", e.target.value)}
                      className="col-span-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSlot(index)}
                      className="col-span-1"
                      disabled={newDoctorSlots.length === 1}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove slot</span>
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={handleAddSlot} className="mt-2 bg-transparent">
                  <Plus className="mr-2 h-4 w-4" /> Add Another Slot
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddDoctor} disabled={isAddingDoctor}>
                {isAddingDoctor ? "Adding..." : "Add Doctor"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {doctors.map((doctor) => (
          <Card key={doctor._id} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-full">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{doctor.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Stethoscope className="h-4 w-4 text-blue-600" />
                      <span className="text-blue-700 font-medium">{doctor.specialization}</span>
                    </div>
                  </div>
                </div>
                <Button variant="destructive" size="icon" onClick={() => handleDeleteDoctor(doctor._id)}>
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete Doctor</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Available Schedule
                  </h4>
                  <div className="space-y-2">
                    {doctor.availableSlots.length > 0 ? (
                      doctor.availableSlots.map((slot, index) => (
                        <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-sm">{slot.day}</span>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No available slots defined.</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <Badge variant={doctor.isActive ? "default" : "secondary"}>
                      {doctor.isActive ? "Available" : "Unavailable"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {doctors.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Stethoscope className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No doctors available</h3>
            <p className="text-gray-600">Add new doctors using the "Add Doctor" button above.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
