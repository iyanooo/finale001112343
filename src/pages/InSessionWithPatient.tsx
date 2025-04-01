import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Activity, ThermometerSun, Weight, Heart, AlertCircle, User, Calendar, UserCog, FlaskRound as Flask } from 'lucide-react';
import { supabase } from '../supabase';
import type { Doctor } from '../types/database';
import { checkLighthouseConnection, getFromLighthouse, storeMedicalRecord, type LighthouseStatus } from '../utils/lighthouse';
import { connectToBlockchain, addMedicalRecord, getPatientRecords, checkGanacheConnection } from '../utils/blockchain';
import { mockVitalSigns } from '../utils/test-data';

interface VitalSigns extends Record<string, any> {
  ipfsHash: string;
  patientId: string;
  doctor: string;
  timestamp: string;
  consultationId: string;
  patientName: string;
  doctorName: string;
  data?: {
    bloodPressure: string;
    bodyWeight: number;
    temperature: number;
    allergies: string[];
    timestamp: number;
    recordedBy: string;
    diagnosis?: string;
    prescription?: string;
    diagnosisTimestamp?: number;
    updatedBy?: string;
  };
}

interface ConsultationRecord {
  consultationId: string;
  patientId: string;
  patientName: string;
  doctorAddress: string;
  doctorName: string;
  timestamp: number;
  vitalSigns: {
    bloodPressure: string;
    bodyWeight: number;
    temperature: number;
    allergies: string[];
    timestamp: number;
    recordedBy: string;
    diagnosis?: string;
    prescription?: string;
    diagnosisTimestamp?: number;
    updatedBy?: string;
  };
}

const populateLighthouseWithMockData = async (lighthouseStatus: LighthouseStatus | null) => {
  if (!lighthouseStatus?.connected) {
    console.error("Cannot populate Lighthouse - not connected");
    return null;
  }
  
  try {
    const populatedRecords = await Promise.all(
      mockVitalSigns.map(async (record) => {
        try {
          console.log("Storing mock record in Lighthouse:", record.data);
          const cid = await storeMedicalRecord(record.data);
          console.log("Mock record stored with CID:", cid);
          return {
            ...record,
            cid
          };
        } catch (error) {
          console.error("Error storing mock record in Lighthouse:", error);
          return null;
        }
      })
    );
    
    return populatedRecords.filter(Boolean);
  } catch (error) {
    console.error("Error populating Lighthouse with mock data:", error);
    return null;
  }
};

export default function InSessionWithPatient() {
  const [vitalSigns, setVitalSigns] = useState<VitalSigns[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('Patient');
  const [appointmentDetails, setAppointmentDetails] = useState<any>(null);
  const [doctorInfo, setDoctorInfo] = useState<Doctor | null>(null);
  const [accessedAppointments, setAccessedAppointments] = useState<any[]>([]);
  const [lighthouseStatus, setLighthouseStatus] = useState<LighthouseStatus | null>(null);
  const [showLabTestModal, setShowLabTestModal] = useState(false);
  const [testType, setTestType] = useState('');
  const [description, setDescription] = useState('');
  const [ganacheConnected, setGanacheConnected] = useState(false);
  const [blockchainConnection, setBlockchainConnection] = useState<any>(null);
  const [newVitalSignData, setNewVitalSignData] = useState({
    bloodPressure: '',
    bodyWeight: 0,
    temperature: 0,
    allergies: '',
  });
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState<number | null>(null);
  const [diagnosisData, setDiagnosisData] = useState({
    diagnosis: '',
    prescription: ''
  });

  const navigate = useNavigate();

  // Check connections on mount
  useEffect(() => {
    async function checkConnections() {
      try {
        console.log("Starting connection checks...");
        
        // Check Lighthouse connection instead of IPFS
        console.log("Checking Lighthouse connection...");
        const lighthouseConnectionStatus = await checkLighthouseConnection();
        console.log("Lighthouse connection status:", lighthouseConnectionStatus);
        setLighthouseStatus(lighthouseConnectionStatus);

        // Always attempt to populate Lighthouse with mock data for testing
        if (lighthouseConnectionStatus.connected) {
          console.log("Lighthouse is connected. Preloading mock data...");
          const populatedRecords = await populateLighthouseWithMockData(lighthouseConnectionStatus);
          if (populatedRecords) {
            console.log("Successfully populated Lighthouse with mock data");
          }
        } else {
          console.warn("Lighthouse is not connected. Some features may not work correctly.");
        }

        // Check Ganache connection
        console.log("Checking Ganache connection...");
        const isGanacheConnected = await checkGanacheConnection();
        console.log("Ganache connection status:", isGanacheConnected);
        setGanacheConnected(isGanacheConnected);
        
        if (!isGanacheConnected) {
          throw new Error('Ganache is not connected. Please start Ganache on port 7545.');
        }

        // Connect to blockchain
        console.log("Connecting to blockchain...");
        const connection = await connectToBlockchain();
        console.log("Blockchain connection result:", connection);
        
        if (!connection?.contract) {
          throw new Error('Blockchain contract not initialized.');
        }
        
        setBlockchainConnection(connection);

        const currentPatientId = localStorage.getItem('currentPatientId');
        if (currentPatientId) {
          setAuthorized(true);
          await connectAndFetchData(currentPatientId, connection);
        }
      } catch (err) {
        console.error('Error in checkConnections:', err);
        setError(err.message || 'Failed to establish connections. Please check Lighthouse and Ganache.');
      } finally {
        setLoading(false);
      }
    }

    checkConnections();
  }, []);

  // Set doctor info
  useEffect(() => {
    const storedInfo = localStorage.getItem('doctorInfo');
    if (!storedInfo) {
      navigate('/employee');
      return;
    }
    setDoctorInfo(JSON.parse(storedInfo));
  }, [navigate]);

  // Fetch accessed appointments
  useEffect(() => {
    if (!doctorInfo) return;

    const fetchAccessedAppointments = async () => {
      try {
        const { data: accessData, error } = await supabase
          .from('record_access')
          .select(`
            *,
            appointment:appointments(
              *,
              patient:profiles(*)
            )
          `)
          .eq('doctor_id', doctorInfo.id)
          .eq('status', 'granted');

        if (error) throw error;
        const appointments = accessData.map(access => access.appointment).filter(Boolean);
          setAccessedAppointments(appointments);
      } catch (err) {
        console.error('Error fetching accessed appointments:', err);
      }
    };

    fetchAccessedAppointments();
  }, [doctorInfo]);

  // Check authorization and set patient info
  useEffect(() => {
    const checkAuthorization = async () => {
      const currentPatientId = localStorage.getItem('currentPatientId');
      const currentPatientName = localStorage.getItem('currentPatientName') || 'Unknown Patient';
      
      if (!currentPatientId) {
        setLoading(false);
        return;
      }
      
      setPatientName(currentPatientName);
      
        const appointmentDetailsStr = localStorage.getItem('appointmentDetails');
        if (appointmentDetailsStr) {
          setAppointmentDetails(JSON.parse(appointmentDetailsStr));
        }
        
          setAuthorized(true);
      setLoading(false); // Loading stops here if no data fetch is needed
    };
    
    checkAuthorization();
  }, []);

  const connectAndFetchData = async (patientId: string, connection = blockchainConnection) => {
    console.log("Starting to fetch data for patient:", patientId);
    try {
      if (!connection || !connection.contract) {
        throw new Error('Blockchain connection not available - please restart Ganache');
      }

      console.log("Fetching patient records from blockchain...");
      const records = await getPatientRecords(connection.contract, patientId);
      
      console.log("Records retrieved:", records);
      if (!records || records.length === 0) {
        console.log("No records found. You can add new records.");
        setVitalSigns([]);
        return;
      }

      console.log("Processing records with IPFS data...");
      const detailedRecords = await Promise.all(
        records.map(async (record: any) => {
          const ipfsHash = record.ipfsHash;
          try {
            const data = await getFromLighthouse(ipfsHash);
            return {
              ipfsHash,
              patientId: record.patientId,
              doctor: record.doctor,
              timestamp: String(record.timestamp),
              data,
            };
          } catch (ipfsErr) {
            console.error(`Error fetching IPFS data for ${ipfsHash}:`, ipfsErr);
            return {
              ipfsHash,
              patientId: record.patientId,
              doctor: record.doctor,
              timestamp: String(record.timestamp),
              data: null,
            };
          }
        })
      );

      // Sort records by timestamp in descending order (newest first)
      const sortedRecords = detailedRecords.sort((a, b) => 
        parseInt(b.timestamp) - parseInt(a.timestamp)
      );

      console.log("Setting vital signs with data:", sortedRecords.length);
      setVitalSigns(sortedRecords);
    } catch (err) {
      console.error('Error in connectAndFetchData:', err);
      setError(`Failed to fetch patient data: ${err.message}. Please ensure Ganache is running.`);
      setVitalSigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestLabTest = async () => {
    if (!doctorInfo || !appointmentDetails) return;

    try {
      const { error } = await supabase
        .from('lab_tests')
        .insert({
          appointment_id: appointmentDetails.id,
          doctor_id: doctorInfo.id,
          patient_id: appointmentDetails.patient_id,
          test_type: testType,
          description: description,
          status: 'pending',
        });

      if (error) throw error;

      setShowLabTestModal(false);
      setTestType('');
      setDescription('');
      alert('Lab test requested successfully');
    } catch (err) {
      console.error('Error requesting lab test:', err);
      alert('Failed to request lab test');
    }
  };

  const handleAddVitalSign = async () => {
    if (!blockchainConnection?.contract) {
      alert("Blockchain connection not established. Please ensure Ganache is running.");
      return;
    }

    if (!lighthouseStatus?.connected) {
      alert("Lighthouse is not connected. Cannot store vital signs.");
      return;
    }

    try {
      setLoading(true);
      const currentPatientId = localStorage.getItem('currentPatientId');
      
      if (!currentPatientId) {
        alert("No patient selected. Please select a patient first.");
        return;
      }

      const vitalSignData = {
        bloodPressure: newVitalSignData.bloodPressure,
        heartRate: isNaN(newVitalSignData.heartRate) ? 0 : Number(newVitalSignData.heartRate),
        bodyWeight: isNaN(newVitalSignData.bodyWeight) ? 0 : Number(newVitalSignData.bodyWeight),
        temperature: isNaN(newVitalSignData.temperature) ? 0 : Number(newVitalSignData.temperature),
        allergies: newVitalSignData.allergies ? newVitalSignData.allergies.split(',').map(a => a.trim()) : [],
        timestamp: Date.now(),
        recordedBy: blockchainConnection.address || 'Unknown doctor',
      };

      console.log("Storing vital sign data in Lighthouse:", vitalSignData);
      
      // Store the data in Lighthouse
      const cid = await storeMedicalRecord(vitalSignData);
      console.log("Vital sign data stored in Lighthouse with CID:", cid);

      // Add the record to the blockchain
      await addMedicalRecord(
        blockchainConnection.contract,
        blockchainConnection.address,
        currentPatientId,
        cid
      );
      console.log("Record added to blockchain");

      // Reset form and close modal
      setNewVitalSignData({
        bloodPressure: '',
        heartRate: 0,
        bodyWeight: 0,
        temperature: 0,
        allergies: ''
      });
      setShowAddRecordModal(false);
      
      // Refresh the records to show the new one
      await connectAndFetchData(currentPatientId, blockchainConnection);
      
      alert("Vital signs added successfully!");
    } catch (error) {
      console.error("Error adding vital sign:", error);
      alert(`Failed to add vital sign: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDiagnosis = async () => {
    if (!blockchainConnection?.contract) {
      alert("Blockchain is not connected. Cannot add diagnosis.");
      return;
    }

    if (!lighthouseStatus?.connected) {
      alert("Lighthouse is not connected. Cannot add diagnosis.");
      return;
    }

    const currentPatientId = localStorage.getItem('currentPatientId');
    if (!currentPatientId) {
      alert("No patient ID found. Please select a patient first.");
      return;
    }

    try {
      const record = vitalSigns[selectedRecordIndex];
      if (!record) {
        throw new Error("Selected record not found");
      }

      // Create updated record preserving all existing data
      const updatedRecord = {
        ...record.data, // Preserve all existing vital signs data
        diagnosis: diagnosisData.diagnosis,
        prescription: diagnosisData.prescription,
        diagnosisTimestamp: Date.now(),
        diagnosisBy: blockchainConnection.address || 'Unknown doctor'
      };

      console.log("Storing updated record with diagnosis in Lighthouse:", updatedRecord);
      
      // Store the updated record to Lighthouse
      const cid = await storeMedicalRecord(updatedRecord);
      console.log("Updated record stored in Lighthouse with CID:", cid);

      // Add the record to the blockchain
      await addMedicalRecord(
        blockchainConnection.contract,
        blockchainConnection.address,
        currentPatientId,
        cid
      );

      // Close the modal and reset the form
      setShowDiagnosisModal(false);
      setDiagnosisData({ diagnosis: '', prescription: '' });
      
      // Refresh the records to show the updated diagnosis
      await connectAndFetchData(currentPatientId, blockchainConnection);
      
      alert("Diagnosis and prescription added successfully!");
    } catch (error) {
      console.error("Error adding diagnosis:", error);
      alert(`Failed to add diagnosis: ${error.message}`);
    }
  };

  const refreshBlockchainConnection = async () => {
    setLoading(true);
    try {
      const isGanacheConnected = await checkGanacheConnection();
      setGanacheConnected(isGanacheConnected);
      if (!isGanacheConnected) throw new Error('Ganache not connected');

      const connection = await connectToBlockchain();
      setBlockchainConnection(connection);

      const currentPatientId = localStorage.getItem('currentPatientId');
      if (currentPatientId && connection?.contract) {
        await connectAndFetchData(currentPatientId, connection);
      }
    } catch (err) {
      setError(err.message || 'Failed to refresh connections');
    } finally {
      setLoading(false);
    }
  };

  const renderConnectionStatus = () => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">System Status</h2>
        <button
          onClick={refreshBlockchainConnection}
          className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Connections
        </button>
      </div>
      <div className={`mb-4 p-3 rounded-lg ${lighthouseStatus?.connected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${lighthouseStatus?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="font-medium">IPFS Status: {lighthouseStatus?.connected ? 'Connected' : 'Not Connected'}</span>
        </div>
      </div>
      <div className={`mb-4 p-3 rounded-lg ${ganacheConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${ganacheConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="font-medium">Ganache Status: {ganacheConnected ? 'Connected' : 'Not Connected'}</span>
        </div>
      </div>
      <div className={`p-3 rounded-lg ${blockchainConnection?.contract ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${blockchainConnection?.contract ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="font-medium">Blockchain: {blockchainConnection?.contract ? 'Connected' : 'Not Connected'}</span>
        </div>
      </div>
    </div>
  );

  const renderVitalSigns = () => {
    if (vitalSigns.length === 0) {
      return <div className="text-center py-8 text-gray-500">No vital signs records found</div>;
    }

    return (
      <div className="space-y-4">
        {vitalSigns.map((record, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold">{new Date(parseInt(record.timestamp) * 1000).toLocaleString()}</h3>
              <span className="text-xs text-gray-500">Doctor: {record.doctor?.substring(0, 8)}...</span>
            </div>
            {record.data ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2"><Heart className="w-5 h-5 text-pink-600" />{record.data.bloodPressure}</div>
                  <div className="flex items-center gap-2"><Weight className="w-5 h-5 text-pink-600" />{record.data.bodyWeight} kg</div>
                  <div className="flex items-center gap-2"><ThermometerSun className="w-5 h-5 text-pink-600" />{record.data.temperature} °C</div>
                  {record.data.allergies?.length > 0 && (
                    <div className="flex items-start gap-2 col-span-2">
                      <AlertCircle className="w-5 h-5 text-pink-600 mt-0.5" />
                      <div>
                        <span className="font-medium">Allergies:</span>
                        <ul className="list-disc pl-5 mt-1">{record.data.allergies.map((a: string, i: number) => <li key={i}>{a}</li>)}</ul>
                      </div>
                    </div>
                  )}
                </div>
                {record.data.diagnosis && (
                  <div className="mt-4 border-t pt-3">
                    <div className="mb-2"><h4 className="font-medium">Diagnosis:</h4><p>{record.data.diagnosis}</p></div>
                    <div><h4 className="font-medium">Prescription:</h4><p>{record.data.prescription || 'None'}</p></div>
                    {record.data.diagnosisTimestamp && (
                      <div className="text-xs text-gray-500 mt-2">{new Date(record.data.diagnosisTimestamp).toLocaleString()}</div>
                    )}
                  </div>
                )}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedRecordIndex(index);
                      setDiagnosisData({
                        diagnosis: record.data.diagnosis || '',
                        prescription: record.data.prescription || ''
                      });
                      setShowDiagnosisModal(true);
                    }}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {record.data.diagnosis ? 'Edit Diagnosis' : 'Add Diagnosis'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500 py-4">Unable to load record data from IPFS</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg text-gray-700 mb-6">{error}</p>
        <div className="flex gap-4">
          <button onClick={refreshBlockchainConnection} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry Connection
          </button>
          <button onClick={() => navigate('/doctor-dashboard')} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
          Return to Dashboard
        </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {renderConnectionStatus()}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Accessed Patient Records</h2>
          <div className="space-y-4">
            {accessedAppointments.map((appointment) => (
              <div key={appointment.id} className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium flex items-center gap-2">
                      <UserCog className="w-5 h-5 text-green-600" />
                      {appointment.patient.first_name} {appointment.patient.surname}
                    </h3>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                          {new Date(appointment.appointment_date).toLocaleDateString()} at{' '}
                        {new Date(appointment.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {appointment.notes && <p className="text-sm text-gray-600">Notes: {appointment.notes}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.setItem('currentPatientId', appointment.patient_id);
                      localStorage.setItem('currentPatientName', `${appointment.patient.first_name} ${appointment.patient.surname}`);
                      localStorage.setItem('appointmentDetails', JSON.stringify(appointment));
                      window.location.reload();
                    }}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    View Records
                  </button>
                </div>
              </div>
            ))}
            {accessedAppointments.length === 0 && <p className="text-center text-gray-500">No patient records accessible</p>}
          </div>
        </div>
        {authorized && appointmentDetails && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Patient Records: {patientName}</h1>
              <button
                onClick={() => setShowAddRecordModal(true)}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2"
                disabled={!blockchainConnection?.contract || !ganacheConnected}
              >
                <Activity className="w-4 h-4" />
                Add Vital Signs
              </button>
            </div>
            {renderVitalSigns()}
          </div>
        )}
        {appointmentDetails && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Lab Tests</h2>
              <button
                onClick={() => setShowLabTestModal(true)}
                className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700"
              >
                <Flask className="w-4 h-4" />
                Request Lab Test
              </button>
            </div>
            <p className="text-gray-600">Request laboratory tests for this patient.</p>
          </div>
        )}
        {showLabTestModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Request Lab Test</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="testType" className="block text-sm font-medium text-gray-700">Test Type</label>
                  <input
                    type="text"
                    id="testType"
                    className="mt-1 p-2 w-full border rounded-md"
                    value={testType}
                    onChange={(e) => setTestType(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    id="description"
                    className="mt-1 p-2 w-full border rounded-md"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowLabTestModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                  <button onClick={handleRequestLabTest} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">Submit</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {showAddRecordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Add Vital Signs</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="bloodPressure" className="block text-sm font-medium text-gray-700">Blood Pressure</label>
                  <input
                    type="text"
                    id="bloodPressure"
                    placeholder="e.g. 120/80"
                    className="mt-1 p-2 w-full border rounded-md"
                    value={newVitalSignData.bloodPressure}
                    onChange={(e) => setNewVitalSignData({ ...newVitalSignData, bloodPressure: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="bodyWeight" className="block text-sm font-medium text-gray-700">Body Weight (kg)</label>
                  <input
                    type="number"
                    id="bodyWeight"
                    className="mt-1 p-2 w-full border rounded-md"
                    value={newVitalSignData.bodyWeight}
                    onChange={(e) => setNewVitalSignData({ ...newVitalSignData, bodyWeight: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label htmlFor="temperature" className="block text-sm font-medium text-gray-700">Temperature (°C)</label>
                  <input
                    type="number"
                    id="temperature"
                    step="0.1"
                    className="mt-1 p-2 w-full border rounded-md"
                    value={newVitalSignData.temperature}
                    onChange={(e) => setNewVitalSignData({ ...newVitalSignData, temperature: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label htmlFor="allergies" className="block text-sm font-medium text-gray-700">Allergies (comma separated)</label>
                  <textarea
                    id="allergies"
                    className="mt-1 p-2 w-full border rounded-md"
                    placeholder="e.g. Peanuts, Penicillin"
                    value={newVitalSignData.allergies}
                    onChange={(e) => setNewVitalSignData({ ...newVitalSignData, allergies: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowAddRecordModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                  <button onClick={handleAddVitalSign} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">Save</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {showDiagnosisModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">{diagnosisData.diagnosis ? 'Edit Diagnosis' : 'Add Diagnosis'}</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700">Diagnosis</label>
                  <textarea
                    id="diagnosis"
                    className="mt-1 p-2 w-full border rounded-md h-24"
                    value={diagnosisData.diagnosis}
                    onChange={(e) => setDiagnosisData({ ...diagnosisData, diagnosis: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="prescription" className="block text-sm font-medium text-gray-700">Prescription</label>
                  <textarea
                    id="prescription"
                    className="mt-1 p-2 w-full border rounded-md h-24"
                    value={diagnosisData.prescription}
                    onChange={(e) => setDiagnosisData({ ...diagnosisData, prescription: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setShowDiagnosisModal(false); setSelectedRecordIndex(null); }} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                  <button onClick={handleAddDiagnosis} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 