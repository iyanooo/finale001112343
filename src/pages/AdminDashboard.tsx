import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  Users,
  Activity,
  FileText,
  Download,
  RefreshCw,
  ChevronDown,
  Filter
} from 'lucide-react';
import { supabase } from '../supabase';
import type { Doctor, Profile } from '../types/database';

interface Report {
  id: string;
  type: 'appointment_stats' | 'lab_analytics' | 'doctor_workload' | 'patient_history';
  parameters: any;
  result: any;
  created_at: string;
  report_period: string;
}

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReportType, setSelectedReportType] = useState<string>('appointment_stats');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [patients, setPatients] = useState<Profile[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReports();
    fetchPatients();
    fetchDoctors();
  }, []);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('generated_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('first_name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .order('name');

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      const params: any = {};
      if (selectedReportType === 'patient_history' && selectedPatient) {
        params.patient_id = selectedPatient;
      }

      const { data, error } = await supabase.rpc('create_report', {
        report_type_param: selectedReportType,
        start_date: new Date(dateRange.start).toISOString(),
        end_date: new Date(dateRange.end).toISOString(),
        params: params
      });

      if (error) throw error;
      
      await fetchReports();
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const downloadReport = (report: Report) => {
    const blob = new Blob([JSON.stringify(report.result, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${report.type}-${new Date(report.created_at).toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const renderReportContent = (report: Report) => {
    switch (report.type) {
      case 'appointment_stats':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900">Total Appointments</h4>
                <p className="text-2xl font-bold text-blue-600">{report.result.total_appointments}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900">Daily Average</h4>
                <p className="text-2xl font-bold text-green-600">{report.result.daily_average}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-900">Status Breakdown</h4>
                <div className="space-y-1 mt-2">
                  {Object.entries(report.result.status_breakdown || {}).map(([status, count]) => (
                    <div key={status} className="flex justify-between">
                      <span className="capitalize">{status}</span>
                      <span className="font-medium">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Appointments by Doctor</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                {Object.entries(report.result.by_doctor || {}).map(([doctor, count]) => (
                  <div key={doctor} className="flex justify-between py-1">
                    <span>Dr. {doctor}</span>
                    <span className="font-medium">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'lab_analytics':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900">Total Tests</h4>
                <p className="text-2xl font-bold text-blue-600">{report.result.total_tests}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900">Completion Rate</h4>
                <p className="text-2xl font-bold text-green-600">{report.result.completion_rate}%</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-900">Status Breakdown</h4>
                <div className="space-y-1 mt-2">
                  {Object.entries(report.result.status_breakdown || {}).map(([status, count]) => (
                    <div key={status} className="flex justify-between">
                      <span className="capitalize">{status}</span>
                      <span className="font-medium">{count as number}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Test Types</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                {Object.entries(report.result.test_types || {}).map(([type, count]) => (
                  <div key={type} className="flex justify-between py-1">
                    <span>{type}</span>
                    <span className="font-medium">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'doctor_workload':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-2">Appointments by Doctor</h4>
              <div className="space-y-4">
                {Object.entries(report.result.appointments || {}).map(([doctor, stats]: [string, any]) => (
                  <div key={doctor} className="bg-white p-4 rounded-lg border">
                    <h5 className="font-medium mb-2">Dr. {doctor}</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-2 rounded">
                        <p className="text-sm text-blue-900">Total</p>
                        <p className="font-bold text-blue-600">{stats.total_appointments}</p>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <p className="text-sm text-green-900">Completed</p>
                        <p className="font-bold text-green-600">{stats.completed}</p>
                      </div>
                      <div className="bg-yellow-50 p-2 rounded">
                        <p className="text-sm text-yellow-900">Pending</p>
                        <p className="font-bold text-yellow-600">{stats.pending}</p>
                      </div>
                      <div className="bg-purple-50 p-2 rounded">
                        <p className="text-sm text-purple-900">Daily Avg</p>
                        <p className="font-bold text-purple-600">{stats.daily_average}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Lab Tests by Doctor</h4>
              <div className="space-y-4">
                {Object.entries(report.result.lab_tests || {}).map(([doctor, stats]: [string, any]) => (
                  <div key={doctor} className="bg-white p-4 rounded-lg border">
                    <h5 className="font-medium mb-2">Dr. {doctor}</h5>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-2 rounded">
                        <p className="text-sm text-blue-900">Total Tests</p>
                        <p className="font-bold text-blue-600">{stats.total_tests}</p>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <p className="text-sm text-green-900">Completed</p>
                        <p className="font-bold text-green-600">{stats.completed}</p>
                      </div>
                      <div className="bg-yellow-50 p-2 rounded">
                        <p className="text-sm text-yellow-900">Pending</p>
                        <p className="font-bold text-yellow-600">{stats.pending}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'patient_history':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Patient Information</h4>
              <div className="space-y-1">
                <p><span className="font-medium">Name:</span> {report.result.patient_info.name}</p>
                <p><span className="font-medium">Age:</span> {report.result.patient_info.age}</p>
                <p><span className="font-medium">Gender:</span> {report.result.patient_info.gender}</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Appointments History</h4>
              <div className="space-y-2">
                {(report.result.appointments || []).map((appointment: any, index: number) => (
                  <div key={index} className="bg-white p-4 rounded-lg border">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{appointment.type}</p>
                        <p className="text-sm text-gray-600">Dr. {appointment.doctor}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(appointment.date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        appointment.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {appointment.status}
                      </span>
                    </div>
                    {appointment.notes && (
                      <p className="text-sm text-gray-600 mt-2">{appointment.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Lab Tests</h4>
              <div className="space-y-2">
                {(report.result.lab_tests || []).map((test: any, index: number) => (
                  <div key={index} className="bg-white p-4 rounded-lg border">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{test.type}</p>
                        <p className="text-sm text-gray-600">Dr. {test.doctor}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(test.date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        test.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {test.status}
                      </span>
                    </div>
                    {test.results && (
                      <p className="text-sm text-gray-600 mt-2">{test.results}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Vital Signs History</h4>
              <div className="space-y-2">
                {(report.result.vital_signs || []).map((vitals: any, index: number) => (
                  <div key={index} className="bg-white p-4 rounded-lg border">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Temperature</p>
                        <p className="font-medium">{vitals.temperature}°C</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Blood Pressure</p>
                        <p className="font-medium">{vitals.blood_pressure}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Weight</p>
                        <p className="font-medium">{vitals.weight} kg</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {new Date(vitals.date).toLocaleDateString()}
                    </p>
                    {vitals.notes && (
                      <p className="text-sm text-gray-600 mt-2">{vitals.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return <p>No data available</p>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <button
              onClick={() => navigate('/doctor/dashboard')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Back to Dashboard
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-900">Total Appointments</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {reports.find(r => r.type === 'appointment_stats')?.result?.total_appointments || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Activity className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-green-900">Lab Tests</p>
                  <p className="text-2xl font-bold text-green-600">
                    {reports.find(r => r.type === 'lab_analytics')?.result?.total_tests || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-purple-900">Doctors</p>
                  <p className="text-2xl font-bold text-purple-600">{doctors.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-pink-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-8 h-8 text-pink-600" />
                <div>
                  <p className="text-sm text-pink-900">Reports Generated</p>
                  <p className="text-2xl font-bold text-pink-600">{reports.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Report Generator */}
          <div className="bg-gray-50 p-6 rounded-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">Generate New Report</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Type
                </label>
                <div className="relative">
                  <select
                    value={selectedReportType}
                    onChange={(e) => setSelectedReportType(e.target.value)}
                    className="w-full p-2 pr-8 border rounded-lg appearance-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="appointment_stats">Appointment Statistics</option>
                    <option value="lab_analytics">Lab Analytics</option>
                    <option value="doctor_workload">Doctor Workload</option>
                    <option value="patient_history">Patient History</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {selectedReportType === 'patient_history' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Patient
                  </label>
                  <div className="relative">
                    <select
                      value={selectedPatient}
                      onChange={(e) => setSelectedPatient(e.target.value)}
                      className="w-full p-2 pr-8 border rounded-lg appearance-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="">Select a patient</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.first_name} {patient.surname}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              )}

              <div className={selectedReportType === 'patient_history' ? 'md:col-span-4' : ''}>
                <button
                  onClick={generateReport}
                  disabled={generatingReport || (selectedReportType === 'patient_history' && !selectedPatient)}
                  className="w-full mt-6 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {generatingReport ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-4 h-4" />
                      Generate Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Reports List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Generated Reports</h2>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  onChange={(e) => setSelectedReportType(e.target.value || '')}
                  className="p-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                >
                  <option value="">All Reports</option>
                  <option value="appointment_stats">Appointment Statistics</option>
                  <option value="lab_analytics">Lab Analytics</option>
                  <option value="doctor_workload">Doctor Workload</option>
                  <option value="patient_history">Patient History</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {reports
                .filter(report => !selectedReportType || report.type === selectedReportType)
                .map((report) => (
                  <div key={report.id} className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium capitalize">
                          {report.type.replace('_', ' ')}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Generated on {new Date(report.created_at).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => downloadReport(report)}
                        className="p-2 text-gray-600 hover:text-gray-900"
                        title="Download Report"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                    {renderReportContent(report)}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}