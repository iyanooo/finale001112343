/*
  # Add Lab Test Request Feature

  1. New Tables
    - `lab_tests`
      - `id` (uuid, primary key)
      - `appointment_id` (uuid, references appointments)
      - `doctor_id` (uuid, references doctors)
      - `patient_id` (uuid, references profiles)
      - `test_type` (text)
      - `description` (text)
      - `status` (text: pending, completed, cancelled)
      - `created_at` (timestamptz)
      - `results` (text, nullable)

  2. Security
    - Enable RLS on `lab_tests` table
    - Add policies for doctors, lab technicians, and patients
    - Add indexes for performance

  3. Changes
    - Add status check constraint
    - Add notification trigger for status changes
*/

-- Create lab_tests table
CREATE TABLE IF NOT EXISTS lab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  test_type text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  results text
);

-- Create indexes
CREATE INDEX IF NOT EXISTS lab_tests_appointment_id_idx ON lab_tests(appointment_id);
CREATE INDEX IF NOT EXISTS lab_tests_doctor_id_idx ON lab_tests(doctor_id);
CREATE INDEX IF NOT EXISTS lab_tests_patient_id_idx ON lab_tests(patient_id);

-- Add status check constraint
ALTER TABLE lab_tests DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE lab_tests ADD CONSTRAINT valid_status
  CHECK (status IN ('pending', 'completed', 'cancelled'));

-- Enable RLS
ALTER TABLE lab_tests ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Doctors can create lab tests"
  ON lab_tests
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM doctors WHERE doctors.id = lab_tests.doctor_id
  ));

CREATE POLICY "Doctors can view tests they created"
  ON lab_tests
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM doctors WHERE doctors.id = lab_tests.doctor_id
  ));

CREATE POLICY "Lab technicians can view all lab tests"
  ON lab_tests
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM lab_technicians WHERE lab_technicians.staff_number = current_user
  ));

CREATE POLICY "Lab technicians can update test results"
  ON lab_tests
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM lab_technicians WHERE lab_technicians.staff_number = current_user
  ));

CREATE POLICY "Patients can view their own tests"
  ON lab_tests
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- Create notification function for lab test status changes
CREATE OR REPLACE FUNCTION notify_lab_test_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    -- Notify patient
    INSERT INTO notifications (
      id,
      user_id,
      type,
      title,
      message
    )
    VALUES (
      gen_random_uuid(),
      NEW.patient_id,
      'lab_test',
      CASE 
        WHEN NEW.status = 'completed' THEN 'Lab Test Results Available'
        WHEN NEW.status = 'cancelled' THEN 'Lab Test Cancelled'
        ELSE 'Lab Test Status Updated'
      END,
      CASE 
        WHEN NEW.status = 'completed' THEN 'Your lab test results are now available'
        WHEN NEW.status = 'cancelled' THEN 'Your lab test has been cancelled'
        ELSE 'Your lab test status has been updated'
      END
    );

    -- Notify doctor
    INSERT INTO notifications (
      id,
      user_id,
      type,
      title,
      message
    )
    VALUES (
      gen_random_uuid(),
      NEW.doctor_id,
      'lab_test',
      CASE 
        WHEN NEW.status = 'completed' THEN 'Lab Test Results Ready'
        WHEN NEW.status = 'cancelled' THEN 'Lab Test Cancelled'
        ELSE 'Lab Test Status Updated'
      END,
      CASE 
        WHEN NEW.status = 'completed' THEN 'Lab test results are ready for review'
        WHEN NEW.status = 'cancelled' THEN 'A lab test has been cancelled'
        ELSE 'A lab test status has been updated'
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for notifications
CREATE TRIGGER lab_test_notification_trigger
  AFTER UPDATE OF status ON lab_tests
  FOR EACH ROW
  EXECUTE FUNCTION notify_lab_test_update();