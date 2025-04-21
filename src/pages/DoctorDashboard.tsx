import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, User, LogOut, CheckCircle, Clock3, Check, X, FlaskRound as Flask } from 'lucide-react';
import { supabase } from '../supabase';
import type { Appointment, Profile, Doctor } from '../types/database';

interface AppointmentWithPatient extends Appointment {
  patient: Profile;
}

export function DoctorDashboard() {
  const navigate = useNavigate();
  const [accessRequests, setAccessRequests] = useState<Record<string, boolean>>({});
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [doctorInfo, setDoctorInfo] = useState<Doctor | null>(null);
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted'>('pending');
  const [processingAppointment, setProcessingAppointment] = useState<string | null>(null);
  const [inSessionAppointments, setInSessionAppointments] = useState<AppointmentWithPatient[]>([]);
  const [showLabTestModal, setShowLabTestModal] = useState(false);
  const [testType, setTestType] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithPatient | null>(null);

  useEffect(() => {
    const storedInfo = localStorage.getItem('doctorInfo');
    if (!storedInfo) {
      navigate('/employee');
      return;
    }
    setDoctorInfo(JSON.parse(storedInfo));
  }, [navigate]);

  useEffect(() => {
    if (doctorInfo) {
      fetchAppointments();
      fetchInSessionAppointments();
      const interval = setInterval(fetchAppointments, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [doctorInfo]);

  const fetchInSessionAppointments = async () => {
    if (!doctorInfo) return;
    
    try {
      // Get appointments where doctor has been granted record access
      const { data: accessData, error: accessError } = await supabase
        .from('record_access')
        .select(`
          appointment_id,
          patient_id
        `)
        .eq('doctor_id', doctorInfo.id)
        .eq('status', 'granted');

      if (accessError) throw accessError;

      if (accessData && accessData.length > 0) {
        // Get the appointments with patient details
        const { data: appointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            *,
            patient:profiles(*)
          `)
          .in('id', accessData.map(a => a.appointment_id))
          .eq('status', 'accepted');

        if (appointmentsError) throw appointmentsError;
        setInSessionAppointments(appointments || []);
      }
    } catch (error) {
      console.error('Error fetching in-session appointments:', error);
    }
  };
  useEffect(() => {
    if (doctorInfo) {
      fetchAccessRequests();
    }
  }, [doctorInfo]);

  const fetchAppointments = async () => {
    if (!doctorInfo) return;
    
    try {
      const now = new Date();
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:profiles(*)
        `)
        .eq('doctor_id', doctorInfo.id)
        .in('status', ['pending', 'accepted'])
        .order('status', { ascending: false }) // pending first
        .order('appointment_date', { ascending: true }); // then by date

      if (error) throw error;
      
      // Filter and sort appointments
      const sortedAppointments = (data || []).sort((a, b) => {
        // First sort by status (pending comes before accepted)
        if (a.status !== b.status) {
          return a.status === 'pending' ? -1 : 1;
        }
        // Then sort accepted appointments by date (soonest first)
        if (a.status === 'accepted' && b.status === 'accepted') {
          return new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime();
        }
        return 0;
      });

      setAppointments(sortedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessRequests = async () => {
    if (!doctorInfo) return;
    
    try {
      const { data } = await supabase
        .from('record_access')
        .select()
        .eq('doctor_id', doctorInfo.id);
        
      const requests: Record<string, boolean> = {};
      data?.forEach(request => {
        requests[request.appointment_id] = true;
      });
      
      setAccessRequests(requests);
    } catch (error) {
      console.error('Error fetching access requests:', error);
    }
  };

  const requestRecordAccess = async (appointment: AppointmentWithPatient) => {
    if (!doctorInfo) return;
    
    setIsRequestingAccess(true);
    try {
      // Check for existing request
      const { data: existingRequest, error: checkError } = await supabase
        .from('record_requests')
        .select()
        .eq('doctor_id', doctorInfo.id)
        .eq('patient_id', appointment.patient_id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingRequest) {
        alert('A record access request already exists for this patient');
        navigate('/doctor/pending-requests');
        return;
      }

      // Create new request
      const { error: insertError } = await supabase
        .from('record_requests')
        .insert({
          patient_id: appointment.patient_id,
          doctor_id: doctorInfo.id,
          appointment_id: appointment.id,
          doctor_name: doctorInfo.name,
          status: 'pending',
        });

      if (insertError) throw insertError;

      setAccessRequests(prev => ({
        ...prev,
        [appointment.id]: true
      }));

      alert('Record access request sent successfully');
      navigate('/doctor/pending-requests'); // Navigate only after success
    } catch (error) {
      console.error('Error requesting record access:', error);
      alert('Failed to send record access request. Please try again.');
    } finally {
      setIsRequestingAccess(false);
    }
  };

  const handleAppointmentAction = async (appointmentId: string, action: 'accepted' | 'rejected') => {
    if (!doctorInfo) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Authentication error. Please sign in again.');
      handleSignOut();
      return;
    }
    
    setProcessingAppointment(appointmentId);
    try {
      const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) throw new Error('Appointment not found');

      // Update appointment status
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ 
          status: action === 'accepted' ? 'accepted' : 'rejected',
          notes: action === 'accepted' 
            ? 'Appointment confirmed. Please arrive 10 minutes before your scheduled time.'
            : 'Appointment rejected by doctor.'
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .upsert({
          id: crypto.randomUUID(),
          user_id: appointment.patient_id,
          type: 'appointment_update',
          title: `Appointment ${action === 'accepted' ? 'Accepted' : 'Rejected'}`,
          message: action === 'accepted' 
            ? `Your appointment with Dr. ${doctorInfo.name} has been confirmed. Please arrive 10 minutes early.`
            : `Your appointment with Dr. ${doctorInfo.name} is not available. Please reschedule.`,
          created_at: new Date().toISOString()
        });

      if (notificationError) throw notificationError;

      // If rejected, delete the appointment
      if (action === 'rejected') {
        const { error: deleteError } = await supabase
          .from('appointments')
          .delete()
          .eq('id', appointmentId);

        if (deleteError) throw deleteError;
      }

      // Update local state
      setAppointments(prev => 
        action === 'rejected'
          ? prev.filter(a => a.id !== appointmentId)
          : prev.map(a => 
              a.id === appointmentId 
                ? { ...a, status: action === 'accepted' ? 'accepted' : 'rejected' }
                : a
            )
      );

    } catch (error) {
      console.error('Error updating appointment:', error);
      alert('Failed to update appointment. Please try again.');
    } finally {
      setProcessingAppointment(null);
    }
  };

  const handleRequestLabTest = async () => {
    if (!doctorInfo || !selectedAppointment) return;

    try {
      const { error } = await supabase
        .from('lab_tests')
        .insert({
          appointment_id: selectedAppointment.id,
          doctor_id: doctorInfo.id,
          patient_id: selectedAppointment.patient_id,
          test_type: testType,
          description: description,
          status: 'pending'
        });

      if (error) throw error;

      setShowLabTestModal(false);
      setTestType('');
      setDescription('');
      setSelectedAppointment(null);
      alert('Lab test requested successfully');
    } catch (error) {
      console.error('Error requesting lab test:', error);
      alert('Failed to request lab test. Please try again.');
    }
  };

  const handleSignOut = () => {
    supabase.auth.signOut().then(() => {
      localStorage.removeItem('doctorInfo');
      window.location.href = '/employee';
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <main className="flex-1 p-6">
      {/* Doctor Info Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 flex-1">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Welcome, Dr. {doctorInfo?.name}</h1>
            <p className="text-gray-600">Staff Number: {doctorInfo?.staff_number}</p>
            <p className="text-gray-600 mt-2">
              Total Appointments: {appointments.length} ({appointments.filter(a => a.status === 'pending').length} pending)
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/doctor/pending-requests"
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Pending Requests
            </Link>
            <button 
              onClick={handleSignOut}
              className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Appointments Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Appointments</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'pending'
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Clock3 className="w-4 h-4" />
              Pending
              {appointments.filter(a => a.status === 'pending').length > 0 && (
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === 'pending'
                    ? 'bg-white text-pink-600'
                    : 'bg-pink-100 text-pink-600'
                }`}>
                  {appointments.filter(a => a.status === 'pending').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('accepted')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'accepted'
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Accepted
              {appointments.filter(a => a.status === 'accepted').length > 0 && (
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === 'accepted'
                    ? 'bg-white text-pink-600'
                    : 'bg-pink-100 text-pink-600'
                }`}>
                  {appointments.filter(a => a.status === 'accepted').length}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {appointments
            .filter(appointment => appointment.status === activeTab)
            .map((appointment) => (
            <div 
              key={appointment.id} 
              className={`border-l-4 ${
                appointment.status === 'pending' 
                  ? 'border-yellow-400 bg-yellow-50' 
                  : 'border-green-500 bg-green-50'
              } p-4 rounded-lg`}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-pink-600" />
                    <h3 className="font-semibold">{appointment.type}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <p className="text-sm text-gray-600">
                      {appointment.patient.first_name} {appointment.patient.surname}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <p className="text-sm text-gray-600">
                      {new Date(appointment.appointment_date).toLocaleDateString()} at{' '}
                      {new Date(appointment.appointment_date).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {appointment.notes && (
                    <p className="text-sm text-gray-600 italic">
                      Notes: {appointment.notes}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    appointment.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </span>
                  {appointment.status === 'pending' && (
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => handleAppointmentAction(appointment.id, 'accepted')}
                        disabled={processingAppointment === appointment.id}
                        className="p-1.5 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                        title="Accept appointment"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAppointmentAction(appointment.id, 'rejected')}
                        disabled={processingAppointment === appointment.id}
                        className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                        title="Reject appointment"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {appointment.status === 'accepted' && (
                    <button
                        onClick={async () => {
                          try {
                            // Update appointment status to completed
                            const { error: updateError } = await supabase
                              .from('appointments')
                              .update({
                                status: 'completed',
                                notes: 'Appointment completed and moved to patient records.'
                              })
                              .eq('id', appointment.id);

                            if (updateError) throw updateError;

                            // Create record request
                            const { error: requestError } = await supabase
                              .from('record_requests')
                              .insert({
                                patient_id: appointment.patient_id,
                                doctor_id: doctorInfo.id,
                                appointment_id: appointment.id,
                                doctor_name: doctorInfo.name,
                                status: 'pending'
                              });

                            if (requestError) throw requestError;

                            // Update local state
                            setAppointments(prev => 
                              prev.filter(a => a.id !== appointment.id || a.status !== 'accepted')
                            );

                            // Store session info and navigate
                            fetchInSessionAppointments(); // Refresh in-session appointments
                            localStorage.setItem('currentPatientId', appointment.patient_id);
                            localStorage.setItem('currentPatientName', `${appointment.patient.first_name} ${appointment.patient.surname}`);
                            localStorage.setItem('appointmentDetails', JSON.stringify(appointment));
                            navigate('/doctor/pending-requests');
                          } catch (error) {
                            console.error('Error starting session:', error);
                            alert('Failed to start session. Please try again.');
                          }
                        }}
                        className="px-3 py-1.5 text-sm bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                      >
                        Start Session
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {appointments.filter(a => a.status === activeTab).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No {activeTab} appointments
            </div>
          )}
        </div>
      </div>
    </main>
  );
}