import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Weight, ThermometerSun, AlertCircle, Clock, UserCog } from 'lucide-react';
import { checkLighthouseConnection, getFromLighthouse, type LighthouseStatus } from '../utils/lighthouse';
import { connectToBlockchain, getPatientRecords } from '../utils/blockchain';
import { checkGanacheConnection } from '../utils/blockchain';
import { getDoctorName } from '../utils/doctors';

interface MedicalRecord {
  ipfsHash: string;
  patientId: string;
  doctor: string;
  doctorName?: string;
  timestamp: string;
  consultationId?: string;
  patientName?: string;
  data?: {
    bloodPressure?: string;
    bodyWeight?: number;
    temperature?: number;
    allergies?: string[];
    timestamp?: number;
    recordedBy?: string;
    diagnosis?: string;
    prescription?: string;
    diagnosisTimestamp?: number;
    updatedBy?: string;
  };
}

export function Diagnosis() {
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lighthouseStatus, setLighthouseStatus] = useState<LighthouseStatus | null>(null);
  const [blockchainConnection, setBlockchainConnection] = useState<any>(null);
  const [patientName, setPatientName] = useState('Patient');
  const [patientId, setPatientId] = useState<string | null>(null);

  const navigate = useNavigate();

  const fetchMedicalRecords = async (patientId: string, connection = blockchainConnection) => {
    try {
      setLoading(true);
      console.log("Fetching patient records from blockchain for patient:", patientId);
      const records = await getPatientRecords(connection.contract, patientId);
      console.log("Raw blockchain records:", records);
      
      if (!records || records.length === 0) {
        console.log("No records found for patient:", patientId);
        setMedicalRecords([]);
        return;
      }

      console.log("Processing records with IPFS data...");
      const detailedRecords = await Promise.all(
        records.map(async (record: any, index: number) => {
          console.log(`Processing record ${index}:`, record);
          const ipfsHash = record.ipfsHash || record[0];
          const doctorAddress = record.doctor || record[2];
          const doctorName = getDoctorName(doctorAddress);
          try {
            const data = await getFromLighthouse(ipfsHash);
            console.log(`Lighthouse data for ${ipfsHash}:`, data);
            if (data.patientId && data.patientId !== patientId) {
              console.log("Skipping record - patient ID mismatch");
              return null;
            }
            return {
              ipfsHash,
              patientId: record.patientId || record[1],
              doctor: doctorAddress,
              doctorName,
              timestamp: String(record.timestamp || record[3]),
              consultationId: data?.consultationId,
              patientName: data?.patientName,
              data,
            };
          } catch (ipfsErr) {
            console.error(`Error fetching IPFS data for ${ipfsHash}:`, ipfsErr);
            return {
              ipfsHash,
              patientId: record.patientId || record[1],
              doctor: doctorAddress,
              doctorName,
              timestamp: String(record.timestamp || record[3]),
              data: null,
            };
          }
        })
      );

      const validRecords = detailedRecords.filter((record): record is MedicalRecord => record !== null);
      const sortedRecords = validRecords.sort((a, b) => 
        parseInt(b.timestamp) - parseInt(a.timestamp)
      );

      console.log(`Found ${sortedRecords.length} valid records for patient ${patientId}:`, sortedRecords);
      setMedicalRecords(sortedRecords);
    } catch (err) {
      console.error('Error fetching medical records:', err);
      setError(`Failed to fetch medical records: ${err.message}`);
      setMedicalRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshRecords = async () => {
    if (patientId && blockchainConnection) {
      await fetchMedicalRecords(patientId, blockchainConnection);
    }
  };

  useEffect(() => {
    async function checkConnections() {
      try {
        const lighthouseConnectionStatus = await checkLighthouseConnection();
        setLighthouseStatus(lighthouseConnectionStatus);

        const isGanacheConnected = await checkGanacheConnection();
        if (!isGanacheConnected) {
          throw new Error('Ganache is not connected. Please start Ganache on port 7545.');
        }

        const connection = await connectToBlockchain();
        if (!connection?.contract) {
          throw new Error('Blockchain contract not initialized.');
        }
        setBlockchainConnection(connection);

        const currentPatientId = localStorage.getItem('currentPatientId');
        const currentPatientName = localStorage.getItem('currentPatientName');
        
        if (currentPatientId && currentPatientName) {
          setPatientId(currentPatientId);
          setPatientName(currentPatientName);
          await fetchMedicalRecords(currentPatientId, connection);
        } else {
          setError('No patient selected. Please select a patient first.');
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

  const renderMedicalRecord = (record: MedicalRecord) => {
    console.log("Rendering record:", record);
    if (!record.data) {
      return (
        <div className="text-center text-gray-500 py-4">
          Unable to load record data from Lighthouse
        </div>
      );
    }

    const recordTimestamp = parseInt(record.timestamp) * 1000;
    const dataTimestamp = record.data.timestamp;
    const diagnosisTimestamp = record.data.diagnosisTimestamp;

  return (
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Consultation
              {isNaN(recordTimestamp) ? '' : ` on ${new Date(recordTimestamp).toLocaleString()}`}
            </h3>
            <p className="text-sm text-gray-600">
              Doctor: {record.doctorName}
            </p>
          </div>
          {dataTimestamp && !isNaN(dataTimestamp) && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              {new Date(dataTimestamp).toLocaleString()}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <Heart className="w-5 h-5 text-pink-600" />
            <div>
              <p className="text-sm text-gray-600">Blood Pressure</p>
              <p className="font-medium">{record.data.bloodPressure ? record.data.bloodPressure : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <Weight className="w-5 h-5 text-pink-600" />
            <div>
              <p className="text-sm text-gray-600">Body Weight</p>
              <p className="font-medium">{record.data.bodyWeight !== undefined ? `${record.data.bodyWeight} kg` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <ThermometerSun className="w-5 h-5 text-pink-600" />
            <div>
              <p className="text-sm text-gray-600">Temperature</p>
              <p className="font-medium">{record.data.temperature !== undefined ? `${record.data.temperature} °C` : ''}</p>
                    </div>
                  </div>
                </div>

        {record.data.allergies?.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-pink-600" />
              <h4 className="font-medium">Allergies</h4>
            </div>
            <ul className="list-disc pl-5 space-y-1">
              {record.data.allergies.map((allergy, index) => (
                <li key={index} className="text-gray-600">{allergy}</li>
              ))}
            </ul>
          </div>
        )}

        {record.data.diagnosis && (
          <div className="border-t pt-6">
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Diagnosis</h4>
              <p className="text-gray-600 whitespace-pre-wrap">{record.data.diagnosis}</p>
            </div>
                <div>
              <h4 className="font-medium text-gray-900 mb-2">Prescription</h4>
              <p className="text-gray-600 whitespace-pre-wrap">
                {record.data.prescription || 'No prescription provided'}
                  </p>
                </div>
            {diagnosisTimestamp && !isNaN(diagnosisTimestamp) && (
              <div className="text-sm text-gray-500 mt-4">
                Diagnosis updated on: {new Date(diagnosisTimestamp).toLocaleString()}
              </div>
            )}
          </div>
        )}
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
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => navigate('/doctor-dashboard')}
          className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
        >
          Return to Dashboard
        </button>
                      </div>
                    );
                  }

                  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
                      <div>
              <h1 className="text-2xl font-bold text-gray-900">Medical History</h1>
              <p className="text-gray-600">Patient: {patientName}</p>
                        </div>
            <div className="flex gap-2">
              <button
                onClick={refreshRecords}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Records
              </button>
              <button
                onClick={() => navigate('/doctor-dashboard')}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2"
              >
                <UserCog className="w-4 h-4" />
                Back to Dashboard
              </button>
                        </div>
                      </div>

          {medicalRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No medical records found for this patient
                          </div>
          ) : (
            <div className="space-y-6">
              {medicalRecords.map((record: MedicalRecord, index: number) => (
                <div key={record.consultationId || index}>
                  {renderMedicalRecord(record)}
                        </div>
              ))}
                        </div>
                      )}
              </div>
            </div>
          </div>
  );
} 