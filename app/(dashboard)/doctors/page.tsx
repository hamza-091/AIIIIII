"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { User, Clock, Calendar, Stethoscope, Plus, Trash2 } from "lucide-react"
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

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [newDoctorName, setNewDoctorName] = useState("")
  const [newDoctorSpecialization, setNewDoctorSpecialization] = useState("")
  const [isAddingDoctor, setIsAddingDoctor] = useState(false)
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

  const handleAddDoctor = async () => {
    if (!newDoctorName || !newDoctorSpecialization) {
      toast({
        title: "Validation Error",
        description: "Please fill in both name and specialization.",
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
          // Default available slots for new doctors, can be expanded later
          availableSlots: [
            { day: "Monday", startTime: "09:00", endTime: "17:00" },
            { day: "Tuesday", startTime: "09:00", endTime: "17:00" },
            { day: "Wednesday", startTime: "09:00", endTime: "17:00" },
            { day: "Thursday", startTime: "09:00", endTime: "17:00" },
            { day: "Friday", startTime: "09:00", endTime: "15:00" },
          ],
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
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Doctor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Doctor</DialogTitle>
              <DialogDescription>Enter the details for the new doctor.</DialogDescription>
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
                      <Stethoscope className="h-4 w-4" />
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
