import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Clock, Users, LogOut, UserCog, FlaskRound as Flask } from 'lucide-react';
import { supabase } from '../supabase';

interface SidebarLinkProps {
  icon: React.ReactNode;
  text: string;
  to: string;
  active?: boolean;
}

function SidebarLink({ icon, text, to, active = false }: SidebarLinkProps) {
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

interface DoctorSidebarProps {
  doctorName: string;
  onSignOut: () => void;
}

export function DoctorSidebar({ doctorName, onSignOut }: DoctorSidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="p-4">
        <Link to="/doctor/dashboard" className="block">
          <h2 className="text-xl font-bold mb-6 text-pink-600 hover:text-pink-700 transition-colors">
            NeemaMed
          </h2>
        </Link>
        <div className="mb-6">
          <p className="text-sm text-gray-600">Welcome,</p>
          <p className="font-medium">Dr. {doctorName}</p>
        </div>
        <nav>
          <SidebarLink
            icon={<LayoutDashboard size={20} />}
            text="Dashboard"
            to="/doctor/dashboard"
            active={currentPath === '/doctor/dashboard'}
          />
          <SidebarLink
            icon={<Clock size={20} />}
            text="Record Requests"
            to="/doctor/pending-requests"
            active={currentPath === '/doctor/pending-requests'}
          />
          <SidebarLink
            icon={<UserCog size={20} />}
            text="In Session"
            to="/doctor/in-session"
            active={currentPath === '/doctor/in-session'}
          />
          <SidebarLink
            icon={<Flask size={20} />}
            text="Lab Results"
            to="/doctor/lab-results"
            active={currentPath === '/doctor/lab-results'}
          />
          <div className="mt-12 border-t pt-4">
            <button
              onClick={async () => {
                localStorage.removeItem('doctorInfo');
                window.location.href = '/employee';
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors text-gray-700 hover:bg-gray-50 w-full"
            >
              <LogOut size={20} />
              <span>Sign out</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}