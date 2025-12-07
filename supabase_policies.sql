-- Enable RLS on tables if not already enabled
ALTER TABLE core_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to create new core tasks
-- This fixes the "new row violates row-level security policy for table 'core_tasks'" error
CREATE POLICY "Enable insert for authenticated users" 
ON "public"."core_tasks"
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Policy to allow authenticated users to assign tasks to themselves
CREATE POLICY "Enable insert for users based on user_id" 
ON "public"."user_tasks"
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Ensure users can view core tasks (likely already exists, but good to have)
CREATE POLICY "Enable read access for all users" 
ON "public"."core_tasks"
FOR SELECT 
TO authenticated 
USING (true);

-- Ensure users can view/delete their own tasks (likely already exists)
CREATE POLICY "Enable read access for users based on user_id" 
ON "public"."user_tasks"
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id" 
ON "public"."user_tasks"
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
