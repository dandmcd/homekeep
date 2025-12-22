-- Add icon column to core_tasks
ALTER TABLE core_tasks 
ADD COLUMN IF NOT EXISTS icon text;
