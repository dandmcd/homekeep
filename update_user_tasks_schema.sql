-- Allow core_task_id to be null for custom tasks
ALTER TABLE user_tasks ALTER COLUMN core_task_id DROP NOT NULL;

-- Add columns for custom task details
ALTER TABLE user_tasks ADD COLUMN name text;
ALTER TABLE user_tasks ADD COLUMN frequency text;

-- Optional: Add check constraint for frequency if you want to enforce valid values at DB level
-- ALTER TABLE user_tasks ADD CONSTRAINT user_tasks_frequency_check CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'semi_monthly', 'seasonal_spring', 'seasonal_summer', 'seasonal_fall', 'seasonal_winter', 'semi_annual', 'annual'));
