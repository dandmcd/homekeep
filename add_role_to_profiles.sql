-- Add role column to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Update RLS policies for core_tasks to allow admins to manage them

-- Drop existing policies that might conflict or be too restrictive
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "public"."core_tasks";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."core_tasks";

-- Read access for everyone (authenticated)
CREATE POLICY "Enable read access for all users" 
ON "public"."core_tasks"
FOR SELECT 
TO authenticated 
USING (true);

-- Insert/Update/Delete access for admins only
CREATE POLICY "Enable full access for admins" 
ON "public"."core_tasks"
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.user_id = auth.uid() 
    AND role = 'admin'
  )
);
