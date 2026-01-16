-- Add time budget settings to user_profiles table
-- These settings control how tasks are displayed on the home screen

-- Add daily_time_budget column (minutes per day, null means use default)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS daily_time_budget INTEGER DEFAULT NULL;

-- Add budget_enabled column (false = show all due tasks regardless of time)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS budget_enabled BOOLEAN DEFAULT TRUE;

-- Comment on columns for clarity
COMMENT ON COLUMN user_profiles.daily_time_budget IS 'User-configurable daily time budget in minutes. NULL means use system default (75 min).';
COMMENT ON COLUMN user_profiles.budget_enabled IS 'When false, shows all due tasks regardless of time budget.';

-- Create task_list_audit table for admin tracking
CREATE TABLE IF NOT EXISTS task_list_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    task_id UUID REFERENCES user_tasks(id) ON DELETE SET NULL,
    from_list TEXT,
    to_list TEXT,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying by user
CREATE INDEX IF NOT EXISTS idx_task_list_audit_user_id ON task_list_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_task_list_audit_created_at ON task_list_audit(created_at);

-- RLS policies for task_list_audit
ALTER TABLE task_list_audit ENABLE ROW LEVEL SECURITY;

-- Users can only see their own audit entries
CREATE POLICY "Users can view own audit entries" ON task_list_audit
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own audit entries
CREATE POLICY "Users can insert own audit entries" ON task_list_audit
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all audit entries
CREATE POLICY "Admins can view all audit entries" ON task_list_audit
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );
