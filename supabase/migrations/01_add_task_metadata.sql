-- Add room and estimated_time columns to core_tasks
ALTER TABLE core_tasks 
ADD COLUMN IF NOT EXISTS room text,
ADD COLUMN IF NOT EXISTS estimated_time integer; -- in minutes

-- Add room and estimated_time columns to user_tasks
ALTER TABLE user_tasks
ADD COLUMN IF NOT EXISTS room text,
ADD COLUMN IF NOT EXISTS estimated_time integer;

-- Update existing core tasks with seed data (approximate values)
UPDATE core_tasks SET room = 'Kitchen', estimated_time = 45 WHERE name ILIKE '%kitchen%';
UPDATE core_tasks SET room = 'Living Room', estimated_time = 15 WHERE name ILIKE '%vacuum%';
UPDATE core_tasks SET room = 'Bathroom', estimated_time = 30 WHERE name ILIKE '%bathroom%';
UPDATE core_tasks SET room = 'Bedroom', estimated_time = 20 WHERE name ILIKE '%bed%';
UPDATE core_tasks SET room = 'General', estimated_time = 10 WHERE room IS NULL;

-- Automatically propagate to user_tasks (if you have triggers, otherwise one-time sync)
UPDATE user_tasks ut
SET 
  room = ct.room,
  estimated_time = ct.estimated_time
FROM core_tasks ct
WHERE ut.core_task_id = ct.id;
