import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, FileText } from 'lucide-react';
import { supabase } from '../supabase';
import type { Doctor, Appointment } from '../types/database';

export function Appointments() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch doctors
      const { data } = await supabase
        .from('doctors')
        .select('*')
        .order('name');
      setDoctors(data || []);

      // Fetch user's appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor:doctors(*)
        `)
        .eq('patient_id', user.id)
        .order('appointment_date', { ascending: true });
      
      setAppointments(appointments || []);

      setLoading(false);
    }
    
    fetchData();
  }, []);

  if (loading) {
    return (
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        </div>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Combine date and time
      const appointmentDate = new Date(`${date}T${time}`);

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          patient_id: user.id,
          doctor_id: selectedDoctor,
          appointment_date: appointmentDate.toISOString(),
          type: 'Consultation',
          notes: description,
          status: 'pending'
        })
        .select('*, doctor:doctors(*)')
        .single();

      if (error) throw error;

      // Update local appointments list
      setAppointments([...appointments, data]);

      // Reset form
      setSelectedDoctor('');
      setDescription('');
      setDate('');
      setTime('');

    } catch (error) {
      console.error('Error scheduling appointment:', error);
      alert('Failed to schedule appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Schedule an Appointment</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Appointment Form */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">New Appointment</h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Doctor
                </label>
                <div className="relative">
                  <select
                    className="w-full p-2 pl-10 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    required
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                  >
                    <option value="">Select a doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name}
                      </option>
                    ))}
                  </select>
                  <User className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brief Description of Problem
                </label>
                <div className="relative">
                  <textarea
                    className="w-full p-2 pl-10 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 min-h-[100px]"
                    placeholder="Please describe your symptoms or reason for visit"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                  <FileText className="w-5 h-5 absolute left-3 top-4 text-gray-400" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    className="w-full p-2 pl-10 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                  <Calendar className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Time
                </label>
                <div className="relative">
                  <select 
                    className="w-full p-2 pl-10 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  >
                    <option value="">Select a time</option>
                    <option value="09:00">09:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="14:00">02:00 PM</option>
                    <option value="15:00">03:00 PM</option>
                    <option value="16:00">04:00 PM</option>
                  </select>
                  <Clock className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={submitting}
                className={`w-full bg-pink-600 text-white py-2 px-4 rounded-lg hover:bg-pink-700 transition-colors ${
                  submitting ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {submitting ? 'Scheduling...' : 'Schedule Appointment'}
              </button>
            </form>
          </div>
          
          {/* Upcoming Appointments */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Upcoming Appointments</h2>
            <div className="space-y-4">
              {appointments.length > 0 ? (
                appointments.map((appointment) => (
                  <div 
                    key={appointment.id} 
                    className={`border-l-4 ${
                      appointment.status === 'pending' 
                        ? 'border-yellow-400 bg-yellow-50' :
                      appointment.status === 'accepted' 
                        ? 'border-green-500 bg-green-50' :
                      appointment.status === 'rejected' 
                        ? 'border-red-500 bg-red-50' :
                        'border-gray-300'
                    } pl-4 py-2`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold flex items-center gap-2">
                          {appointment.type}
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                            appointment.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-700' :
                            appointment.status === 'accepted' 
                              ? 'bg-green-100 text-green-700' :
                            appointment.status === 'rejected' 
                              ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                          }`}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </span>
                        </p>
                        {appointment.doctor && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-900">
                              {appointment.doctor.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              Staff Number: {appointment.doctor.staff_number}
                            </p>
                          </div>
                        )}
                        {appointment.notes && (
                          <p className="text-sm text-gray-600 mt-2 italic">
                            {appointment.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {new Date(appointment.appointment_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(appointment.appointment_date).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500">No appointments scheduled</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}