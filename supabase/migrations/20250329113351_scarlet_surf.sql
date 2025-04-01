/*
  # Create record requests table

  1. New Tables
    - `record_requests`
      - `id` (uuid, primary key)
      - `doctor_id` (uuid, references doctors)
      - `patient_id` (uuid, references profiles)
      - `appointment_id` (uuid, references appointments)
      - `doctor_name` (text)
      - `status` (text, enum: pending, approved, rejected)
      - `requested_at` (timestamptz)

  2. Security
    - Enable RLS on `record_requests` table
    - Add policies for doctors and patients
*/

CREATE TABLE IF NOT EXISTS record_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id uuid REFERENCES doctors(id),
  patient_id uuid REFERENCES profiles(id),
  appointment_id uuid REFERENCES appointments(id),
  doctor_name text NOT NULL,
  status text DEFAULT 'pending',
  requested_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT record_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_record_requests_doctor_id ON record_requests(doctor_id);
CREATE INDEX IF NOT EXISTS idx_record_requests_patient_id ON record_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_record_requests_appointment_id ON record_requests(appointment_id);

-- Enable RLS
ALTER TABLE record_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Doctors can view their own requests"
  ON record_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (
    SELECT id FROM doctors WHERE id = record_requests.doctor_id
  ));

CREATE POLICY "Patients can view requests for their records"
  ON record_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can update request status"
  ON record_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);