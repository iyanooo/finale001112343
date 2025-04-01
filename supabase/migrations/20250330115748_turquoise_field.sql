/*
  # Fix Record Requests Table

  1. Changes
    - Create record_requests table if not exists
    - Add proper indexes for performance
    - Add status check constraint
    - Add RLS policies for proper access control
    - Add notification trigger for request status updates

  2. Security
    - Enable RLS on record_requests table
    - Add policies for:
      - Doctors can view their own requests
      - Patients can view and update requests for their records
*/

-- Create record_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS record_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id uuid REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id),
  doctor_name text NOT NULL,
  status text DEFAULT 'pending',
  requested_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_record_requests_doctor_id ON record_requests(doctor_id);
CREATE INDEX IF NOT EXISTS idx_record_requests_patient_id ON record_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_record_requests_appointment_id ON record_requests(appointment_id);

-- Add status check constraint
ALTER TABLE record_requests DROP CONSTRAINT IF EXISTS record_requests_status_check;
ALTER TABLE record_requests ADD CONSTRAINT record_requests_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- Enable RLS
ALTER TABLE record_requests ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
DROP POLICY IF EXISTS "Doctors can view their own requests" ON record_requests;
CREATE POLICY "Doctors can view their own requests"
  ON record_requests
  FOR SELECT
  TO authenticated
  USING (doctor_id = auth.uid());

DROP POLICY IF EXISTS "Patients can view requests for their records" ON record_requests;
CREATE POLICY "Patients can view requests for their records"
  ON record_requests
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

DROP POLICY IF EXISTS "Patients can update request status" ON record_requests;
CREATE POLICY "Patients can update request status"
  ON record_requests
  FOR UPDATE
  TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- Create notification function for request status updates
CREATE OR REPLACE FUNCTION notify_record_request_update()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
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
      'record_request',
      CASE 
        WHEN NEW.status = 'approved' THEN 'Record Request Approved'
        WHEN NEW.status = 'rejected' THEN 'Record Request Rejected'
        ELSE 'Record Request Updated'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Your request for patient records has been approved'
        WHEN NEW.status = 'rejected' THEN 'Your request for patient records has been rejected'
        ELSE 'Your record request status has been updated'
      END
    );

    -- Create record access if approved
    IF NEW.status = 'approved' THEN
      INSERT INTO record_access (
        patient_id,
        doctor_id,
        appointment_id,
        status
      )
      VALUES (
        NEW.patient_id,
        NEW.doctor_id,
        NEW.appointment_id,
        'granted'
      )
      ON CONFLICT (patient_id, doctor_id) DO UPDATE
      SET status = 'granted',
          updated_at = CURRENT_TIMESTAMP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for notifications
DROP TRIGGER IF EXISTS record_request_notification_trigger ON record_requests;
CREATE TRIGGER record_request_notification_trigger
  AFTER UPDATE ON record_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_record_request_update();