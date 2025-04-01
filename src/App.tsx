import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { 
  Bell, 
  Users, 
  Calendar, 
  FileText, 
  RefreshCw, 
  LogOut,
  Clock,
  ShoppingCart,
} from 'lucide-react';

import { Dashboard } from './pages/Dashboard';
import { MedicalRecords } from './pages/MedicalRecords';
import { Appointments } from './pages/Appointments';
import { Notifications } from './pages/Notifications';
import { AboutUs } from './pages/AboutUs';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { Auth } from './pages/Auth';
import { EmployeeAuth } from './pages/EmployeeAuth';
import { DoctorSidebar } from './components/DoctorSidebar';
import { PendingRequests } from './pages/PendingRequests';
import { LabTechDashboard } from './pages/LabTechDashboard';
import { DoctorLabResults } from './pages/DoctorLabResults';
import { Diagnosis } from './pages/Diagnosis';

import { supabase } from './supabase';
import InSessionWithPatient from './pages/InSessionWithPatient';

function SidebarLink({ icon, text, to, active = false }: { icon: React.ReactNode; text: string; to: string; active?: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
        active ? 'bg-pink-50 text-pink-600' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      {icon}
      <span>{text}</span>
    </Link>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [labTechInfo, setLabTechInfo] = useState(null);

  useEffect(() => {
    if (session) {
      const fetchUnreadNotifications = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('read', false);

        if (!error && data) {
          setUnreadNotifications(data.length);
        }
      };

      fetchUnreadNotifications();

      // Subscribe to notifications changes
      const channel = supabase
        .channel('notifications_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications'
          },
          () => {
            fetchUnreadNotifications();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [session]);

  useEffect(() => {
    const storedDoctorInfo = localStorage.getItem('doctorInfo');
    const storedLabTechInfo = localStorage.getItem('labTechInfo');
    
    if (storedDoctorInfo) {
      try {
        setDoctorInfo(JSON.parse(storedDoctorInfo));
      } catch (e) {
        localStorage.removeItem('doctorInfo');
      }
    } else if (storedLabTechInfo) {
      try {
        setLabTechInfo(JSON.parse(storedLabTechInfo));
      } catch (e) {
        localStorage.removeItem('labTechInfo');
      }
    }
  }, []);

  useEffect(() => {
    async function initAuth() {
      // Check active sessions and sets the user
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    }

    initAuth();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={
          session ? <Navigate to="/dashboard" replace /> : <Auth />
        } />
        <Route path="/employee" element={
          doctorInfo ? <Navigate to="/doctor" replace /> :
          
          labTechInfo ? <Navigate to="/lab" replace /> :
          <EmployeeAuth />
        } />
        <Route path="/" element={
          doctorInfo ? <Navigate to="/doctor" replace /> :
        
          labTechInfo ? <Navigate to="/lab" replace /> :
          session ? <Navigate to="/dashboard" replace /> :
          <Navigate to="/auth" replace />
        } />
        
        {/* Doctor Routes */}
        <Route
          path="/doctor/*"
          element={
            doctorInfo ? (
              <div className="min-h-screen bg-gray-100 flex">
                <DoctorSidebar
                  doctorName={doctorInfo.name}
                  onSignOut={() => {
                    localStorage.removeItem('doctorInfo');
                    navigate('/employee');
                  }}
                />
                <Routes>
                  <Route path="pending-requests" element={<PendingRequests />} />
                  <Route path="in-session" element={<InSessionWithPatient />} />
                  <Route path="lab-results" element={<DoctorLabResults />} />
                  <Route path="dashboard" element={<DoctorDashboard />} />
                  <Route path="" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </div>
            ) : (
              <Navigate to="/employee" replace />
            )
          } />


        {/* Patient Routes */}
        <Route
          path="/*"
          element={
            session ? (
              <div className="min-h-screen bg-gray-100 flex">
                {/* Sidebar */}
                <div className="w-64 bg-white shadow-lg">
                  <div className="p-4">
                    <Link to="/dashboard" className="block">
                      <h2 className="text-xl font-bold mb-6 text-pink-600 hover:text-pink-700 transition-colors">NeemaMed</h2>
                    </Link>
                    <nav>
                      <Link
                        to="/notifications"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors text-gray-700 hover:bg-gray-50 relative"
                      >
                        <Bell size={20} />
                        <span>Notifications</span>
                        {unreadNotifications > 0 && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-pink-600 text-white text-xs px-2 py-0.5 rounded-full">
                            {unreadNotifications}
                          </span>
                        )}
                      </Link>
                      <SidebarLink icon={<Calendar size={20} />} text="Appointments" to="/appointments" />
                      <SidebarLink icon={<FileText size={20} />} text="Medical Records" to="/records" />
                      <SidebarLink icon={<ShoppingCart size={20} />} text="Diagnosis" to="/diagnosis" />
                      <div className="mt-12 border-t pt-4">
                        <button
                          onClick={async () => {
                            await supabase.auth.signOut();
                            window.location.href = '/auth';
                          }}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors text-gray-700 hover:bg-gray-50 w-full"
                        >
                          <LogOut size={20} />
                          <span>Log out</span>
                        </button>
                      </div>
                    </nav>
                  </div>
                </div>

                {/* Main Content */}
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/records" element={<MedicalRecords />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/appointments" element={<Appointments />} />
                  <Route path="/diagnosis" element={<Diagnosis />} />
                  <Route path="/about" element={<AboutUs />} />
                </Routes>
              </div>
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        
        {/* Lab Technician Routes */}
        <Route
          path="/lab/*"
          element={
            labTechInfo ? (
              <Routes>
                <Route path="dashboard" element={<LabTechDashboard />} />
                <Route path="" element={<Navigate to="dashboard" replace />} />
              </Routes>
            ) : (
              <Navigate to="/employee" replace />
            )
          }
        />

        <Route path="/in-session" element={<InSessionWithPatient />} />
      </Routes>
    </Router>
  );
}

export default App