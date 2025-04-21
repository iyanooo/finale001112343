import React, { useState, useEffect } from 'react';
import { Shield, User, Calendar, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import type { Doctor, Profile, RecordRequest, Appointment } from '../types/database';

interface RecordRequestWithPatient extends RecordRequest {
  patient: Profile;
  appointment: Appointment;
}

export function PendingRequests() {
  const [pendingRequests, setPendingRequests] = useState<RecordRequestWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorInfo, setDoctorInfo] = useState<Doctor | null>(null);
  const navigate = useNavigate();
  const [currentAppointment, setCurrentAppointment] = useState<any>(() => {
    try {
      const item = localStorage.getItem('appointmentDetails');
      return item ? JSON.parse(item) : {};
    } catch (error) {
      console.error("Error parsing appointmentDetails from localStorage:", error);
      return {};
    }
  });

  useEffect(() => {
    const storedInfo = localStorage.getItem('doctorInfo');
    if (!storedInfo) {
      navigate('/employee');
      return;
    }
    setDoctorInfo(JSON.parse(storedInfo));
  }, [navigate]);

  const fetchPendingRequests = React.useCallback(async () => {
    if (!doctorInfo) return;

    try {
      console.log('Fetching requests for doctor:', doctorInfo.id);
      const { data, error } = await supabase
        .from('record_requests')
        .select(`
          *,
          patient:profiles(*),
          appointment:appointments(*)
        `)
        .eq('doctor_id', doctorInfo.id)
        .eq('status', 'pending');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Raw pending requests data:', data);
      setPendingRequests(data || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    } finally {
      setLoading(false);
    }
  }, [doctorInfo]);

  useEffect(() => {
    if (doctorInfo) {
      fetchPendingRequests();
      // Set up polling to check for updates
      const interval = setInterval(fetchPendingRequests, 5000);
      return () => clearInterval(interval);
    }
  }, [doctorInfo, fetchPendingRequests]);

  const filteredRequests = currentAppointment.id
    ? pendingRequests.filter(req => req.appointment_id === currentAppointment.id)
    : pendingRequests;

  return (
    <main className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold">Record Access Requests</h1>
          <button
            onClick={() => navigate('/doctor/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-md p-6">
          {filteredRequests.length > 0 ? (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div key={request.id} className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium flex items-center gap-2">
                        <Shield className="w-5 h-5 text-yellow-600" />
                        Record Request for {request.patient.first_name} {request.patient.surname}
                        {request.appointment_id === currentAppointment.id && (
                          <span className="ml-2 text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full">
                            Current Session
                          </span>
                        )}
                      </h3>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          <span>Age: {request.patient.age} | Gender: {request.patient.gender}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>Requested on: {new Date(request.requested_at).toLocaleDateString()}</span>
                        </div>
                        {request.appointment && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span>Appointment: {new Date(request.appointment.appointment_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                      Pending
                    </span>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await supabase
                            .from('record_requests')
                            .update({ status: 'rejected' })
                            .eq('id', request.id);
                          
                          setPendingRequests(prev => 
                            prev.filter(r => r.id !== request.id)
                          );
                        } catch (error) {
                          console.error('Error rejecting request:', error);
                          alert('Failed to reject request');
                        }
                      }}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No pending record access requests for this session
            </div>
          )}
        </div>
      </div>
    </main>
  );
}