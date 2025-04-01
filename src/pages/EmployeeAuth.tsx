import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { supabase } from '../supabase';

export function EmployeeAuth() {
  const [staffNumber, setStaffNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // First try to find a doctor
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select('*')
        .eq('staff_number', staffNumber.trim())
        .maybeSingle();
      
      if (doctorData && !doctorError) {
        localStorage.setItem('doctorInfo', JSON.stringify(doctorData));
        window.location.href = '/doctor';
        return;
      } else if (doctorError && doctorError.code !== 'PGRST116') {
        throw doctorError;
      }

      // If not a doctor, try to find a nurse
      const { data: nurseData, error: nurseError } = await supabase
        .from('nurses')
        .select('*')
        .eq('staff_number', staffNumber.trim())
        .maybeSingle();
      
      if (nurseData && !nurseError) {
        localStorage.setItem('nurseInfo', JSON.stringify(nurseData));
        window.location.href = '/nurse';
        return;
      } else if (nurseError && nurseError.code !== 'PGRST116') {
        throw nurseError;
      }

      // If not a nurse, try to find a lab technician
      const { data: labTechData, error: labTechError } = await supabase
        .from('lab_technicians')
        .select('*')
        .eq('staff_number', staffNumber.trim())
        .maybeSingle();
      
      if (labTechData && !labTechError) {
        localStorage.setItem('labTechInfo', JSON.stringify(labTechData));
        window.location.href = '/lab/dashboard';
        return;
      } else if (labTechError && labTechError.code !== 'PGRST116') {
        throw labTechError;
      }

      // If neither doctor nor lab tech found, show error
      setError('Invalid staff number. Please try again.');
    } catch (error: any) {
      setError('Invalid staff number. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://raw.githubusercontent.com/stackblitz/stackblitz-images/main/medical-cubes-pattern.png"
          alt=""
          className="w-full h-full object-cover opacity-10"
        />
      </div>

      {/* Left side - Illustration and Welcome Message */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 bg-white/80 backdrop-blur-sm relative z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-50/50 to-white/50 backdrop-blur-sm z-0"></div>
        <div className="relative z-10 flex flex-col items-center">
          <img
            src="https://cdn.jsdelivr.net/npm/@healthcare-illustrations/general/general-04.svg"
            alt="Medical Illustration"
            className="w-full max-w-md mb-8"
          />
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Neema Hospital Staff Portal</h1>
            <p className="text-lg text-gray-600 max-w-md">
              Welcome to the staff portal. Access your dashboard to manage patient records and appointments.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-pink-600">Staff Login</h2>
            <h3 className="mt-6 text-2xl font-bold text-gray-900">Welcome Back!</h3>
            <p className="mt-2 text-gray-600">
              Sign in with your staff number to access the dashboard
            </p>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleAuth}>
            <div>
              <label htmlFor="staffNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Staff Number
              </label>
              <div className="relative">
                <input
                  id="staffNumber"
                  name="staffNumber"
                  type="text"
                  required
                  autoComplete="off"
                  value={staffNumber}
                  onChange={(e) => setStaffNumber(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Enter your staff number"
                />
                <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-colors ${
                  loading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>

            <div className="text-center">
              <Link
                to="/auth"
                className="text-sm text-pink-600 hover:text-pink-500"
              >
                Patient Portal Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}