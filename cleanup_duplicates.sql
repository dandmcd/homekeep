-- Deduplication Script for core_tasks
-- This script will:
-- 1. Identify valid duplicates (same name AND frequency).
-- 2. Consolidate any references in `user_tasks` to the oldest version of the task.
-- 3. Delete the newer duplicates.
-- 4. Add a unique constraint to prevent future duplicates.

DO $$
DECLARE
    r RECORD;
    master_id uuid;
BEGIN
    -- Iterate over all tasks that have duplicates
    FOR r IN 
        SELECT name, frequency
        FROM core_tasks
        GROUP BY name, frequency
        HAVING COUNT(*) > 1
    LOOP
        -- Find the ID of the oldest version (the one we keep)
        SELECT id INTO master_id
        FROM core_tasks
        WHERE name = r.name AND frequency = r.frequency
        ORDER BY created_at ASC
        LIMIT 1;

        -- Update any user_tasks that point to the duplicates to point to the master_id instead
        UPDATE user_tasks
        SET core_task_id = master_id
        WHERE core_task_id IN (
            SELECT id 
            FROM core_tasks 
            WHERE name = r.name 
            AND frequency = r.frequency 
            AND id != master_id
        );

        -- Delete the duplicates
        DELETE FROM core_tasks
        WHERE name = r.name 
        AND frequency = r.frequency 
        AND id != master_id;
        
        RAISE NOTICE 'Deduplicated: % (%)', r.name, r.frequency;
    END LOOP;
END $$;

-- Now add the constraint so it doesn't happen again
ALTER TABLE core_tasks 
ADD CONSTRAINT core_tasks_name_frequency_unique UNIQUE (name, frequency);
