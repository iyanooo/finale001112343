/*
  # Record Access Management Updates

  1. Changes
    - Add RLS policies for record_access table
    - Add trigger to notify patients when access is granted/revoked
    - Add constraints to ensure valid status values

  2. Security
    - Enable RLS on record_access table
    - Add policies for:
      - Doctors can view records they have access to
      - Patients can view and manage their own records
*/

-- Enable RLS
ALTER TABLE record_access ENABLE ROW LEVEL SECURITY;

-- Add status check constraint
ALTER TABLE record_access DROP CONSTRAINT IF EXISTS record_access_status_check;
ALTER TABLE record_access ADD CONSTRAINT record_access_status_check 
  CHECK (status IN ('pending', 'granted', 'revoked'));

-- Add RLS policies
CREATE POLICY "Patients can manage their own record access"
  ON record_access
  FOR ALL
  TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "Doctors can view records they have access to"
  ON record_access
  FOR SELECT
  TO authenticated
  USING (doctor_id = auth.uid() AND status = 'granted');

-- Create notification function
CREATE OR REPLACE FUNCTION notify_record_access_update()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message
    )
    SELECT
      NEW.patient_id,
      'record_access',
      CASE 
        WHEN NEW.status = 'granted' THEN 'Record Access Granted'
        WHEN NEW.status = 'revoked' THEN 'Record Access Revoked'
        ELSE 'Record Access Updated'
      END,
      CASE 
        WHEN NEW.status = 'granted' THEN 'Access to your medical records has been granted to Dr. ' || d.name
        WHEN NEW.status = 'revoked' THEN 'Access to your medical records has been revoked from Dr. ' || d.name
        ELSE 'Your medical record access has been updated'
      END
    FROM doctors d
    WHERE d.id = NEW.doctor_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS record_access_notification_trigger ON record_access;
CREATE TRIGGER record_access_notification_trigger
  AFTER UPDATE ON record_access
  FOR EACH ROW
  EXECUTE FUNCTION notify_record_access_update();