export interface Profile {
  id: string;
  first_name: string;
  surname: string;
  age: number;
  gender: string;
  created_at: string;
  updated_at: string;
  upcoming_appointments: number;
}

export interface Doctor {
  id: string;
  name: string;
  email: string;
  staff_number: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
  type: string;
  notes?: string;
  created_at: string;
}

export interface LabTest {
  id: string;
  appointment_id: string;
  doctor_id: string;
  patient_id: string;
  test_type: string;
  description: string;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  results?: string;
}

export interface RecordAccess {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string;
  status: 'pending' | 'granted' | 'revoked';
  created_at: string;
  updated_at: string;
}

export interface RecordRequest {
  id: string;
  doctor_id: string;
  patient_id: string;
  appointment_id: string;
  doctor_name: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
}