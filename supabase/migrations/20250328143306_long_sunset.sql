/*
  # Fix Record Access Implementation

  1. Changes
    - Add missing indexes for performance
    - Add missing trigger for updated_at
    - Add better constraints
    - Improve RLS policies
*/

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create record access table with improvements
CREATE TABLE IF NOT EXISTS record_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  doctor_id uuid REFERENCES doctors(id) ON DELETE CASCADE NOT NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT record_access_status_check CHECK (status IN ('pending', 'granted', 'revoked')),
  UNIQUE(patient_id, doctor_id)
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_record_access_patient_id ON record_access(patient_id);
CREATE INDEX IF NOT EXISTS idx_record_access_doctor_id ON record_access(doctor_id);
CREATE INDEX IF NOT EXISTS idx_record_access_appointment_id ON record_access(appointment_id);
CREATE INDEX IF NOT EXISTS idx_record_access_status ON record_access(status);

-- Add updated_at trigger
CREATE TRIGGER update_record_access_updated_at
  BEFORE UPDATE ON record_access
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE record_access ENABLE ROW LEVEL SECURITY;

-- Improved RLS policies
CREATE POLICY "Doctors can read their own record access requests"
  ON record_access
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM doctors 
      WHERE doctors.id = record_access.doctor_id 
      AND doctors.staff_number = current_user
    )
  );

CREATE POLICY "Patients can read their own record access"
  ON record_access
  FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can update their own record access"
  ON record_access
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (
    auth.uid() = patient_id 
    AND (NEW.status IN ('granted', 'revoked'))
    AND (OLD.status = 'pending' OR OLD.status = 'granted')
  );

-- Function to handle appointment status updates with better error handling
CREATE OR REPLACE FUNCTION update_appointment_with_access() 
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'granted' AND OLD.status = 'pending' THEN
    UPDATE appointments 
    SET status = 'in_session'
    WHERE id = NEW.appointment_id 
    AND status = 'accepted';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;