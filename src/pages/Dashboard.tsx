import React, { useEffect, useState } from 'react';
import { Calendar, Users, Clock, UserCheck, Shield, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { connectToBlockchain, getPatientRecords, fetchRecordFromIPFS } from '../utils/blockchain';
import type { Profile, Appointment, Doctor, RecordAccess, RecordRequest } from '../types/database';

interface RecordAccessWithDoctor extends RecordAccess {
  doctor: Doctor;
}

interface RecordRequestWithDoctor extends RecordRequest {
  doctor: Doctor;
}

interface BlockchainRecord {
  ipfsHash: string;
  patientId: string;
  doctor: string;
  timestamp: number;
}

interface IPFSRecord {
  diagnosis?: string;
  prescription?: string;
  vitalSigns?: {
    bloodPressure?: string;
    bodyWeight?: string;
    temperature?: string;
  };
  allergies?: string[];
}

export function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<(Appointment & { doctor: Doctor })[]>([]);
  const [allAppointments, setAllAppointments] = useState<(Appointment & { doctor: Doctor })[]>([]);
  const [recordAccess, setRecordAccess] = useState<RecordAccessWithDoctor[]>([]);
  const [recordRequests, setRecordRequests] = useState<RecordRequestWithDoctor[]>([]);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RecordAccessWithDoctor | null>(null);
  const [isUpdatingAccess, setIsUpdatingAccess] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedRecordRequest, setSelectedRecordRequest] = useState<RecordRequestWithDoctor | null>(null);
  const [checkoutAppointments, setCheckoutAppointments] = useState<(Appointment & { doctor: Doctor })[]>([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedCheckoutAppointment, setSelectedCheckoutAppointment] = useState<(Appointment & { doctor: Doctor }) | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [blockchainRecords, setBlockchainRecords] = useState<BlockchainRecord[]>([]);
  const [ipfsRecords, setIpfsRecords] = useState<{ [key: string]: IPFSRecord }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Fetch record requests
        const { data: requestsData } = await supabase
          .from('record_requests')
          .select(`
            *,
            doctor:doctors(*)
          `)
          .eq('patient_id', user.id)
          .eq('status', 'pending')
          .order('requested_at', { ascending: false });

        setRecordRequests(requestsData || []);

        // Fetch record access requests
        const { data: accessData } = await supabase
          .from('record_access')
          .select(`
            *,
            doctor:doctors(*)
          `)
          .eq('patient_id', user.id)
          .order('created_at', { ascending: false });

        setRecordAccess(accessData || []);

        // Fetch profile data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setProfile(profileData);
        
        // Get last login time from user metadata
        const lastLoginTime = user.last_sign_in_at;
        if (lastLoginTime) {
          const date = new Date(lastLoginTime);
          setLastLogin(date.toLocaleString());
        }
        
        // Fetch appointments
        await fetchAppointments();

        // Fetch completed appointments for checkout
        const { data: checkoutData } = await supabase
          .from('appointments')
          .select(`
            *,
            doctor:doctors(*)
          `)
          .eq('patient_id', user.id)
          .eq('status', 'completed')
          .order('appointment_date', { ascending: false });

        setCheckoutAppointments(checkoutData || []);

        // Connect to blockchain and fetch records
        try {
          const { contract } = await connectToBlockchain();
          const records = await getPatientRecords(contract, user.id);
          setBlockchainRecords(records);

          // Fetch IPFS records
          const ipfsData: { [key: string]: IPFSRecord } = {};
          for (const record of records) {
            try {
              const data = await fetchRecordFromIPFS(record.ipfsHash);
              ipfsData[record.ipfsHash] = data;
            } catch (error) {
              console.error(`Error fetching IPFS record for hash ${record.ipfsHash}:`, error);
            }
          }
          setIpfsRecords(ipfsData);
        } catch (error) {
          console.error('Error fetching blockchain records:', error);
        }
      }
      setLoading(false);
    }

    getProfile();
  }, []);

  const fetchAppointments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: allAppointmentsData } = await supabase
      .from('appointments')
      .select(`
        *,
        doctor:doctors(*)
      `)
      .eq('patient_id', user.id)
      .in('status', ['pending', 'accepted']);
    
    // Sort appointments: pending first, then by date
    const sortedAppointments = (allAppointmentsData || []).sort((a, b) => {
      // First sort by status (pending comes before accepted)
      if (a.status !== b.status) {
        return a.status === 'pending' ? -1 : 1;
      }
      // Then sort by date
      return new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime();
    });
    
    setAllAppointments(sortedAppointments);
    
    // Filter accepted appointments for the upcoming section
    const upcoming = sortedAppointments.filter(
      app => app.status === 'accepted' && new Date(app.appointment_date) >= new Date()
    );
    setUpcomingAppointments(upcoming);
  };

  const getRecordForAppointment = (appointment: Appointment & { doctor: Doctor }) => {
    // Find the blockchain record that matches this appointment's timestamp
    const record = blockchainRecords.find(r => {
      const recordDate = new Date(r.timestamp * 1000);
      const appointmentDate = new Date(appointment.appointment_date);
      return Math.abs(recordDate.getTime() - appointmentDate.getTime()) < 3600000; // Within 1 hour
    });

    if (record) {
      return ipfsRecords[record.ipfsHash];
    }
    return null;
  };

  const handleAccessRequest = async (status: 'granted' | 'revoked') => {
    if (!selectedRequest) return;

    setIsUpdatingAccess(true);
    try {
      if (status === 'revoked') {
        // Delete the record access entry
        const { error: deleteError } = await supabase
          .from('record_access')
          .delete()
          .eq('id', selectedRequest.id);

        if (deleteError) throw deleteError;
        
        // Update local state by removing the entry
        setRecordAccess(prev => prev.filter(access => access.id !== selectedRequest.id));
      } else {
        // Update the record access status
        const { error: updateError } = await supabase
          .from('record_access')
          .update({ 
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedRequest.id);

        if (updateError) throw updateError;
        
        // Update local state
        setRecordAccess(prev => 
          prev.map(access => 
            access.id === selectedRequest.id 
              ? { ...access, status, updated_at: new Date().toISOString() }
              : access
          )
        );
      }

      setShowAccessModal(false);
      setSelectedRequest(null);

    } catch (error) {
      console.error('Error updating access:', error);
      alert('Failed to update access status. Please try again.');
    } finally {
      setIsUpdatingAccess(false);
    }
  };

  const handleConnectWallet = async () => {
    try {
      // Here you would implement the actual wallet connection logic
      // For now, we'll just simulate it
      setWalletConnected(true);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    }
  };

  const handleCheckout = async (appointment: Appointment & { doctor: Doctor }) => {
    setSelectedCheckoutAppointment(appointment);
    setShowCheckoutModal(true);
  };

  return (
    <main className="flex-1 p-6 space-y-6">
      {/* Welcome Message */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4">
          Welcome back, {profile ? `${profile.first_name} ${profile.surname}` : 'Patient'}
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span className="font-semibold">{allAppointments.length}</span>
            </div>
            <p className="text-sm text-gray-600">Appointments</p>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span className="font-semibold">{lastLogin ? 'Active' : 'First Login'}</span>
            </div>
            <p className="text-sm text-gray-600">Last Login</p>
            {lastLogin && (
              <p className="text-xs text-gray-500 mt-1">{lastLogin}</p>
            )}
          </div>
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span className="font-semibold">{upcomingAppointments.length}</span>
            </div>
            <p className="text-sm text-gray-600">Upcoming Appointments</p>
          </div>
        </div>
      </section>

      {/* Record Access Requests */}
      {recordRequests.length > 0 && (
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Record Requests</h2>
          <div className="space-y-4">
            {recordRequests.map(request => (
              <div key={request.id} className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium flex items-center gap-2">
                      <Shield className="w-5 h-5 text-yellow-600" />
                      Record Request from  {request.doctor_name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Requested on {new Date(request.requested_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedRecordRequest(request);
                        setShowConfirmModal(true);
                      }}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await supabase
                            .from('record_requests')
                            .update({ status: 'rejected' })
                            .eq('id', request.id);
                          
                          setRecordRequests(prev => 
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
              </div>
            ))}
          </div>
        </section>
      )}

      {recordAccess.some(access => access.status === 'pending') && (
        <section className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Record Access Requests</h2>
            <button
              onClick={() => {
                setSelectedRequest(null);
                setShowAccessModal(true);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Request Records Access
            </button>
          </div>
          {/* Access Request Modal */}
          {showAccessModal && selectedRequest && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-xl font-semibold mb-4">Record Access Request</h3>
                <p className="text-gray-700 mb-6">
                  Allow Dr. {selectedRequest.doctor.name} to access and alter your personal patient records?
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowAccessModal(false);
                      setSelectedRequest(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAccessRequest('granted')}
                    disabled={isUpdatingAccess}
                    className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-75"
                  >
                    {isUpdatingAccess ? 'Processing...' : 'Allow Access'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {recordAccess
              .filter(access => access.status === 'pending')
              .map(access => (
                <div key={access.id} className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium flex items-center gap-2">
                        <Shield className="w-5 h-5 text-yellow-600" />
                        Record Access Request from Dr. {access.doctor.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Requested on {new Date(access.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedRequest(access);
                          setShowAccessModal(true);
                        }}
                        className="px-3 py-1.5 text-sm bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                      >
                        Review Request
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Access Management */}
      {/* Revoke Access Modal */}
      {showAccessModal && selectedRequest && selectedRequest.status === 'granted' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Revoke Access</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to revoke Dr. {selectedRequest.doctor.name}'s access to your medical records?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAccessModal(false);
                  setSelectedRequest(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAccessRequest('revoked')}
                disabled={isUpdatingAccess}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-75"
              >
                {isUpdatingAccess ? 'Processing...' : 'Revoke Access'}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Record Access Management</h2>
          <button
            onClick={() => {
              setSelectedRequest(null);
              setShowAccessModal(true);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Request Records Access
          </button>
        </div>
        <div className="space-y-4">
          {recordAccess
            .filter(access => access.status !== 'pending')
            .map(access => (
              <div 
                key={access.id}
                className={`p-4 rounded-lg ${
                  access.status === 'granted' ? 'bg-green-50' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-green-600" />
                      Dr. {access.doctor.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Status: {access.status.charAt(0).toUpperCase() + access.status.slice(1)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Last updated: {new Date(access.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  {access.status === 'granted' ? (
                    <button
                      onClick={() => {
                        setSelectedRequest(access);
                        setShowAccessModal(true);
                      }}
                      disabled={isUpdatingAccess}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      {isUpdatingAccess ? 'Processing...' : 'Revoke Access'}
                    </button>
                  ) : access.status === 'revoked' && (
                    <button
                      onClick={async () => {
                        try {
                          const { error } = await supabase
                            .from('record_access')
                            .update({ 
                              status: 'granted',
                              updated_at: new Date().toISOString()
                            })
                            .eq('id', access.id);

                          if (error) throw error;

                          setRecordAccess(prev => 
                            prev.map(a => 
                              a.id === access.id 
                                ? { ...a, status: 'granted', updated_at: new Date().toISOString() }
                                : a
                            )
                          );
                        } catch (error) {
                          console.error('Error granting access:', error);
                          alert('Failed to grant access. Please try again.');
                        }
                      }}
                      className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Grant Access
                    </button>
                  )}
                </div>
              </div>
            ))}
          {recordAccess.filter(access => access.status !== 'pending').length === 0 && (
            <p className="text-center text-gray-500 py-4">
              No record access granted to any doctors
            </p>
          )}
        </div>
      </section>

      {/* Request Access Modal */}
      {showAccessModal && !selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Request Records Access</h3>
            <p className="text-gray-700 mb-6">
              To request access to your medical records, please contact your healthcare provider directly.
              They will need to submit a formal request through our system.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowAccessModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointments Section */}
      <section className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Appointments</h2>
          <Link 
            to="/appointments"
            className="bg-pink-600 text-white py-2 px-4 rounded-lg hover:bg-pink-700 transition-colors"
          >
            New Appointment
          </Link>
        </div>

        {/* Pending Appointments */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-700">Pending Appointments</h3>
          {allAppointments.filter(app => app.status === 'pending').map((appointment) => (
          <div 
            key={appointment.id} 
              className="border-l-4 border-yellow-400 bg-yellow-50 p-4 rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-pink-600" />
                  <h3 className="font-semibold">{appointment.type}</h3>
                </div>
                <p className="text-sm text-gray-600">
                  With Dr. {appointment.doctor.name}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>
                    {new Date(appointment.appointment_date).toLocaleDateString()} at{' '}
                    {new Date(appointment.appointment_date).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {appointment.notes && (
                  <p className="text-sm text-gray-600 italic">
                    {appointment.notes}
                  </p>
                )}
              </div>
                <span className="inline-block px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
                  Pending
              </span>
            </div>
          </div>
        ))}
          {allAppointments.filter(app => app.status === 'pending').length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No pending appointments
            </div>
          )}
        </div>

        {/* Completed Appointments */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-700">Completed Appointments</h3>
          {allAppointments.filter(app => app.status === 'completed').map((appointment) => (
            <div 
              key={appointment.id} 
              className="border-l-4 border-green-500 bg-green-50 p-4 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-pink-600" />
                    <h3 className="font-semibold">{appointment.type}</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    With Dr. {appointment.doctor.name}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>
                      {new Date(appointment.appointment_date).toLocaleDateString()} at{' '}
                      {new Date(appointment.appointment_date).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {appointment.notes && (
                    <p className="text-sm text-gray-600 italic">
                      {appointment.notes}
                    </p>
                  )}
                </div>
                <span className="inline-block px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                  Completed
                </span>
              </div>
            </div>
          ))}
          {allAppointments.filter(app => app.status === 'completed').length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No completed appointments
          </div>
        )}
        </div>
      </section>

      {/* Diagnosis Section */}
      {checkoutAppointments.length > 0 && (
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Diagnosis & Medical Records</h2>
          <div className="space-y-4">
            {checkoutAppointments.map((appointment) => (
              <div 
                key={appointment.id} 
                className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <h3 className="font-semibold">{appointment.type}</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      With Dr. {appointment.doctor.name}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>
                        {new Date(appointment.appointment_date).toLocaleDateString()} at{' '}
                        {new Date(appointment.appointment_date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {appointment.notes && (
                      <p className="text-sm text-gray-600 italic">
                        {appointment.notes}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleCheckout(appointment)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    View Medical Records
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Medical Records Modal */}
      {showCheckoutModal && selectedCheckoutAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-semibold">Medical Records</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {new Date(selectedCheckoutAppointment.appointment_date).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCheckoutModal(false);
                  setSelectedCheckoutAppointment(null);
                  setWalletConnected(false);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!walletConnected ? (
              <div className="text-center py-8">
                <div className="bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Connect Your Wallet</h4>
                <p className="text-gray-600 mb-6">
                  To view your medical records, please connect your wallet first.
                </p>
                <button
                  onClick={handleConnectWallet}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Connect Wallet
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const record = getRecordForAppointment(selectedCheckoutAppointment);
                  if (!record) {
                    return (
                      <div className="text-center py-4">
                        <p className="text-gray-500">No medical records found for this appointment.</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Diagnosis</h4>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-gray-600">
                            {record.diagnosis || 'No diagnosis available'}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Prescription</h4>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-gray-600">
                            {record.prescription || 'No prescription available'}
                          </p>
                        </div>
                      </div>

                      {record.vitalSigns && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Vital Signs</h4>
                          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                            {record.vitalSigns.bloodPressure && (
                              <p className="text-gray-600">Blood Pressure: {record.vitalSigns.bloodPressure}</p>
                            )}
                            {record.vitalSigns.bodyWeight && (
                              <p className="text-gray-600">Body Weight: {record.vitalSigns.bodyWeight}</p>
                            )}
                            {record.vitalSigns.temperature && (
                              <p className="text-gray-600">Temperature: {record.vitalSigns.temperature}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {record.allergies && record.allergies.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Allergies</h4>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <ul className="list-disc list-inside space-y-1">
                              {record.allergies.map((allergy, index) => (
                                <li key={index} className="text-gray-600">{allergy}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => {
                      setShowCheckoutModal(false);
                      setSelectedCheckoutAppointment(null);
                      setWalletConnected(false);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}