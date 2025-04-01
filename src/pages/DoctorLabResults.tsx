import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskRound as Flask, User, Calendar, Search, Plus, X } from 'lucide-react';
import { supabase } from '../supabase';
import type { LabTest, Profile, Doctor } from '../types/database';

interface LabTestWithDetails extends LabTest {
  patient: Profile;
  results?: string;
}

export function DoctorLabResults() {
  const [doctorInfo, setDoctorInfo] = useState<Doctor | null>(null);
  const [labTests, setLabTests] = useState<LabTestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLabTestModal, setShowLabTestModal] = useState(false);
  const [testType, setTestType] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null);
  const navigate = useNavigate();

  const handleRequestLabTest = async () => {
    if (!doctorInfo || !selectedPatient) return;

    try {
      const { error } = await supabase
        .from('lab_tests')
        .insert({
          doctor_id: doctorInfo.id,
          patient_id: selectedPatient.id,
          test_type: testType,
          description: description,
          status: 'pending'
        });

      if (error) throw error;

      setShowLabTestModal(false);
      setTestType('');
      setDescription('');
      setSelectedPatient(null);
      fetchLabTests(); // Refresh the list
      alert('Lab test requested successfully');
    } catch (error) {
      console.error('Error requesting lab test:', error);
      alert('Failed to request lab test. Please try again.');
    }
  };

  useEffect(() => {
    const storedInfo = localStorage.getItem('doctorInfo');
    if (!storedInfo) {
      navigate('/employee');
      return;
    }
    setDoctorInfo(JSON.parse(storedInfo));
  }, [navigate]);

  useEffect(() => {
    if (!doctorInfo) return;
    fetchLabTests();
  }, [doctorInfo]);

  const fetchLabTests = async () => {
    try {
      const { data, error } = await supabase
        .from('lab_tests')
        .select(`
          *,
          patient:profiles(*),
          lab_test_results(results)
        `)
        .eq('doctor_id', doctorInfo?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process the data to include results
      const processedTests = data?.map(test => ({
        ...test,
        results: test.lab_test_results?.[0]?.results || undefined
      })) || [];

      setLabTests(processedTests);
    } catch (error) {
      console.error('Error fetching lab tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = labTests.filter(test => {
    const searchLower = searchTerm.toLowerCase();
    return (
      test.test_type.toLowerCase().includes(searchLower) ||
      test.patient.first_name.toLowerCase().includes(searchLower) ||
      test.patient.surname.toLowerCase().includes(searchLower) ||
      test.description.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <main className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Lab Test Results</h1>
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Search tests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div className="space-y-4">
            {filteredTests.map((test) => (
              <div key={test.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="bg-pink-50 p-2 rounded-full">
                      <Flask className="w-6 h-6 text-pink-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">{test.test_type}</h3>
                      <div className="mt-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <p className="text-sm text-gray-600">
                            {test.patient.first_name} {test.patient.surname}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <p className="text-sm text-gray-600">
                            {new Date(test.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">{test.description}</p>
                      </div>
                      <div className="mt-2">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          test.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : test.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                        </span>
                      </div>
                      {test.status === 'completed' && test.results && (
                        <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm font-medium mb-2">Results:</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{test.results}</p>
                        </div>
                      )}
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => {
                            setSelectedPatient(test.patient);
                            setShowLabTestModal(true);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                        >
                          <Plus className="w-4 h-4" />
                          Request New Test
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredTests.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No matching lab tests found' : 'No lab tests available'}
              </div>
            )}
          </div>
        </div>

        {/* Lab Test Request Modal */}
        {showLabTestModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold">Request Lab Test</h3>
                  {selectedPatient && (
                    <p className="text-sm text-gray-600 mt-1">
                      for {selectedPatient.first_name} {selectedPatient.surname}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowLabTestModal(false);
                    setTestType('');
                    setDescription('');
                    setSelectedPatient(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="testType" className="block text-sm font-medium text-gray-700 mb-1">
                    Test Type
                  </label>
                  <input
                    type="text"
                    id="testType"
                    value={testType}
                    onChange={(e) => setTestType(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder="e.g., Blood Test, X-Ray, etc."
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 h-32"
                    placeholder="Provide detailed instructions for the lab technician..."
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={() => {
                      setShowLabTestModal(false);
                      setTestType('');
                      setDescription('');
                      setSelectedPatient(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestLabTest}
                    className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                  >
                    Submit Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}