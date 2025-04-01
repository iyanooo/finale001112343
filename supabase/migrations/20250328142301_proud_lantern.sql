/*
  # Record Access Management System

  1. New Tables
    - `record_access`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, references profiles)
      - `doctor_id` (uuid, references doctors)
      - `status` (text: pending, granted, revoked)
      - `appointment_id` (uuid, references appointments)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `record_access` table
    - Add policies for doctors and patients
*/

-- Create record access table
CREATE TABLE IF NOT EXISTS record_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES profiles(id) NOT NULL,
  doctor_id uuid REFERENCES doctors(id) NOT NULL,
  appointment_id uuid REFERENCES appointments(id) NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'granted', 'revoked')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(patient_id, doctor_id)
);

-- Enable RLS
ALTER TABLE record_access ENABLE ROW LEVEL SECURITY;

-- Policies for record_access table
CREATE POLICY "Doctors can read their own record access requests"
  ON record_access
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM doctors WHERE id = doctor_id
  ));

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
  WITH CHECK (auth.uid() = patient_id);

-- Function to handle appointment status updates
CREATE OR REPLACE FUNCTION update_appointment_with_access() 
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'granted' THEN
    UPDATE appointments 
    SET status = 'in_session'
    WHERE id = NEW.appointment_id 
    AND status = 'accepted';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for appointment status updates
CREATE TRIGGER update_appointment_status
  AFTER UPDATE ON record_access
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'granted')
  EXECUTE FUNCTION update_appointment_with_access();