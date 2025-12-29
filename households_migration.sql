-- Helper function to avoid recursion in RLS policies
-- This function runs with higher privileges (SECURITY DEFINER) to check membership without triggering RLS
CREATE OR REPLACE FUNCTION get_my_household_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT household_id FROM household_members WHERE user_id = auth.uid()
$$;

-- Helper function to get household by invite code (bypasses RLS)
CREATE OR REPLACE FUNCTION get_household_by_invite_code(code TEXT)
RETURNS SETOF households
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM households WHERE invite_code = code LIMIT 1
$$;

-- Create households table
CREATE TABLE IF NOT EXISTS households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create household_members table
CREATE TABLE IF NOT EXISTS household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(household_id, user_id)
);

-- Update user_tasks table
ALTER TABLE user_tasks 
ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

-- Policies for households
DROP POLICY IF EXISTS "Households are viewable by members" ON households;
CREATE POLICY "Households are viewable by members" 
ON households FOR SELECT 
USING (
  id IN (SELECT get_my_household_ids())
  OR
  owner_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can create households" ON households;
CREATE POLICY "Users can create households" 
ON households FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = owner_id);

-- Policies for household_members
DROP POLICY IF EXISTS "Members are viewable by other members of the same household" ON household_members;
CREATE POLICY "Members are viewable by other members of the same household" 
ON household_members FOR SELECT 
USING (
  household_id IN (SELECT get_my_household_ids())
);

DROP POLICY IF EXISTS "Users can join households (insert self)" ON household_members;
CREATE POLICY "Users can join households (insert self)" 
ON household_members FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can remove members or members can leave" ON household_members;
CREATE POLICY "Owners can remove members or members can leave" 
ON household_members FOR DELETE 
USING (
  auth.uid() = user_id -- Self leave
  OR 
  auth.uid() IN ( -- Owner remove
    SELECT owner_id FROM households WHERE id = household_members.household_id
  )
);

-- Update user_tasks policies to include household access
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON user_tasks;
DROP POLICY IF EXISTS "Enable read access for users based on user_id or household" ON user_tasks;
CREATE POLICY "Enable read access for users based on user_id or household" 
ON user_tasks FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  (household_id IN (SELECT get_my_household_ids()))
);

DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON user_tasks;
DROP POLICY IF EXISTS "Enable insert for users based on user_id or household" ON user_tasks;
CREATE POLICY "Enable insert for users based on user_id or household" 
ON user_tasks FOR INSERT 
WITH CHECK (
  auth.uid() = user_id
  OR
  (household_id IN (SELECT get_my_household_ids()))
);

DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_tasks;
DROP POLICY IF EXISTS "Enable update for users based on user_id or household" ON user_tasks;
CREATE POLICY "Enable update for users based on user_id or household" 
ON user_tasks FOR UPDATE 
USING (
  auth.uid() = user_id
  OR
  (household_id IN (SELECT get_my_household_ids()))
);

DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON user_tasks;
DROP POLICY IF EXISTS "Enable delete for users based on user_id or household" ON user_tasks;
CREATE POLICY "Enable delete for users based on user_id or household" 
ON user_tasks FOR DELETE 
USING (
  auth.uid() = user_id
  OR
  (household_id IN (SELECT get_my_household_ids()))
);
