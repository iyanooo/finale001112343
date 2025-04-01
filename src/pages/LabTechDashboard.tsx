import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskRound as Flask, User, LogOut, Check, X } from 'lucide-react';
import { supabase } from '../supabase';
import type { LabTest, Profile, Doctor } from '../types/database';

interface LabTestWithDetails extends LabTest {
  patient: Profile;
  doctor: Doctor;
}

export function LabTechDashboard() {
  const [labTechInfo, setLabTechInfo] = useState<{ name: string; staff_number: string } | null>(null);
  const [pendingTests, setPendingTests] = useState<LabTestWithDetails[]>([]);
  const [completedTests, setCompletedTests] = useState<LabTestWithDetails[]>([]);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [testResults, setTestResults] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [viewingTest, setViewingTest] = useState<LabTestWithDetails | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedInfo = localStorage.getItem('labTechInfo');
    if (!storedInfo) {
      navigate('/employee');
      return;
    }
    setLabTechInfo(JSON.parse(storedInfo));
  }, [navigate]);

  useEffect(() => {
    if (!labTechInfo) return;
    
    const interval = setInterval(fetchLabTests, 5000); // Refresh every 5 seconds
    fetchLabTests(); // Initial fetch
    
    return () => clearInterval(interval);
  }, [labTechInfo]);

  const fetchLabTests = async () => {
    try {
      // Fetch pending tests
      const { data: pendingData, error: pendingError } = await supabase
        .from('lab_tests')
        .select(`
          *,
          patient:profiles(*),
          doctor:doctors(*)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;
      setPendingTests(pendingData || []);

      // Fetch completed tests
      const { data: completedData, error: completedError } = await supabase
        .from('lab_tests')
        .select(`
          *,
          patient:profiles(*),
          doctor:doctors(*)
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (completedError) throw completedError;
      setCompletedTests(completedData?.map(test => ({
        ...test,
        results: test.lab_test_results?.[0]?.results || ''
      })).filter(Boolean) || []);

    } catch (error) {
      console.error('Error fetching lab tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResults = async (testId: string) => {
    if (!testResults.trim()) {
      alert('Please enter test results');
      return;
    }

    setSubmitting(true);
    try {
      const test = pendingTests.find(t => t.id === testId);
      if (!test) throw new Error('Test not found');
      if (!labTechInfo) throw new Error('Lab technician info not found');

      // Create lab test result record
      const { error: resultError } = await supabase
        .from('lab_test_results')
        .insert({
          lab_test_id: testId,
          technician_id: labTechInfo.staff_number,
          results: testResults
        });

      if (resultError) throw resultError;

      // Clear form and update UI
      setTestResults('');
      setSelectedTest(null);
      setActiveTab('completed');
      await fetchLabTests(); // Refresh data immediately
      alert('Test results submitted successfully');

    } catch (error) {
      console.error('Error submitting results:', error);
      alert('Failed to submit results. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = () => {
    supabase.auth.signOut().then(() => {
      localStorage.removeItem('labTechInfo');
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
      {/* Lab Tech Info Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {labTechInfo?.name}</h1>
            <p className="text-gray-600">Lab Technician</p>
          </div>
          <button 
            onClick={handleSignOut}
            className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Lab Tests Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Lab Tests</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'pending'
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
              {pendingTests.length > 0 && (
                <span className="ml-2 bg-white text-pink-600 px-2 py-0.5 rounded-full text-xs">
                  {pendingTests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'completed'
                  ? 'bg-pink-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Completed
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          {(activeTab === 'pending' ? pendingTests : completedTests).map((test) => (
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
                      <p className="text-sm text-gray-600 mt-1">
                        Age: {test.patient.age} | Gender: {test.patient.gender}
                      </p>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-medium">Requested by {test.doctor.name}</p>
                      <p className="text-sm text-gray-600 mt-1">{test.description}</p>
                    </div>
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 text-xs bg-yellow-50 text-yellow-600 rounded-full">
                        {activeTab === 'pending' ? 'Pending' : 'Completed by ' + labTechInfo?.name}
                      </span>
                    </div>
                    {test.status === 'completed' && test.results && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Test Results:</p>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{test.results}</p>
                      </div>
                    )}
                    {activeTab === 'completed' && (
                      <div className="mt-3">
                        <button
                          onClick={() => setViewingTest(test)}
                          className="text-sm text-pink-600 hover:text-pink-700 font-medium flex items-center gap-1"
                        >
                          View Results
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {activeTab === 'pending' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTest(selectedTest === test.id ? null : test.id)}
                      className="px-3 py-1.5 text-sm bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                    >
                      {selectedTest === test.id ? 'Cancel' : 'Enter Results'}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Results Form */}
              {selectedTest === test.id && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium mb-2">Enter Test Results</h4>
                  <div className="space-y-4">
                    <textarea
                      value={testResults}
                      onChange={(e) => setTestResults(e.target.value)}
                      placeholder="Enter detailed test results here..."
                      className="w-full p-3 border rounded-lg h-32 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedTest(null);
                          setTestResults('');
                        }}
                        className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSubmitResults(test.id)}
                        disabled={submitting}
                        className={`px-4 py-2 text-sm bg-pink-600 text-white rounded-lg hover:bg-pink-700 flex items-center gap-2 ${
                          submitting ? 'opacity-75 cursor-not-allowed' : ''
                        }`}
                      >
                        {submitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            Submit Results
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {(activeTab === 'pending' ? pendingTests : completedTests).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No {activeTab} lab tests
            </div>
          )}
        </div>
        
        {/* Results Modal */}
        {viewingTest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Flask className="w-5 h-5 text-pink-600" />
                    {viewingTest.test_type}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Completed on {new Date(viewingTest.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => setViewingTest(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Patient Information</h4>
                  <p className="text-sm text-gray-600">
                    {viewingTest.patient.first_name} {viewingTest.patient.surname}
                  </p>
                  <p className="text-sm text-gray-600">
                    Age: {viewingTest.patient.age} | Gender: {viewingTest.patient.gender}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Requesting Doctor</h4>
                  <p className="text-sm text-gray-600">Dr. {viewingTest.doctor.name}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Test Description</h4>
                  <p className="text-sm text-gray-600">{viewingTest.description}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Test Results</h4>
                  <div className="bg-gray-50 p-4 rounded-lg mt-2">
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{viewingTest.results}</p>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setViewingTest(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Close
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