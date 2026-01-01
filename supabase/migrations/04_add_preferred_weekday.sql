-- Migration: Add preferred_weekday to user_tasks
-- Allows users to set which day of the week weekly chores should be due
-- Values: 0=Sunday, 1=Monday, ..., 6=Saturday (matches JavaScript's getDay())

ALTER TABLE user_tasks 
ADD COLUMN IF NOT EXISTS preferred_weekday INTEGER DEFAULT 0;

-- Add constraint to ensure valid weekday values
ALTER TABLE user_tasks
ADD CONSTRAINT user_tasks_preferred_weekday_check 
CHECK (preferred_weekday IS NULL OR (preferred_weekday >= 0 AND preferred_weekday <= 6));
