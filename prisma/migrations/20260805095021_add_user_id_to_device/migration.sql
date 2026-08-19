-- Add user_id column to device table
ALTER TABLE device ADD COLUMN user_id VARCHAR(255);

-- Set a default user_id for existing devices (use the first user's ID)
-- This prevents null constraint violations for existing data
UPDATE device SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL;

-- Make user_id NOT NULL after populating existing rows
ALTER TABLE device ALTER COLUMN user_id SET NOT NULL;

-- Add index for faster queries by user_id
CREATE INDEX idx_device_user_id ON device(user_id);
