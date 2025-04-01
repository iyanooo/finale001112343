/*
  # Add completed status to appointments

  1. Changes
    - Add 'completed' to appointments status check constraint
    - Update appointment status trigger function to handle completed status
    - Add notification for completed appointments

  2. Security
    - No changes to RLS policies needed
*/

-- Update appointments status check constraint
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed'));

-- Update appointment status change notification function
CREATE OR REPLACE FUNCTION handle_appointment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status THEN
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
      'appointment_update',
      CASE 
        WHEN NEW.status = 'completed' THEN 'Appointment Completed'
        WHEN NEW.status = 'accepted' THEN 'Appointment Accepted'
        WHEN NEW.status = 'rejected' THEN 'Appointment Rejected'
        WHEN NEW.status = 'cancelled' THEN 'Appointment Cancelled'
        ELSE 'Appointment Status Updated'
      END,
      CASE 
        WHEN NEW.status = 'completed' THEN 'Your appointment has been marked as completed'
        WHEN NEW.status = 'accepted' THEN 'Your appointment has been confirmed'
        WHEN NEW.status = 'rejected' THEN 'Your appointment has been rejected'
        WHEN NEW.status = 'cancelled' THEN 'Your appointment has been cancelled'
        ELSE 'Your appointment status has been updated'
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;