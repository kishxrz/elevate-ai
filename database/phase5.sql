-- Phase 5 AI Sales Automation Engine Database Migrations

-- 1. Ensure leads table has priority and last_activity_at columns
ALTER TABLE leads ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Cold';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now();

-- 2. Create followups table
CREATE TABLE IF NOT EXISTS followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID DEFAULT auth.uid(),
  whatsapp_message TEXT,
  email_subject TEXT,
  email_body TEXT,
  call_script TEXT,
  next_action TEXT,
  status TEXT DEFAULT 'generated'
);

-- 3. Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID DEFAULT auth.uid(),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'Medium'
);

-- 4. Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID DEFAULT auth.uid(),
  type TEXT,
  message TEXT,
  content JSONB
);

-- 5. Create email_campaigns table
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID DEFAULT auth.uid(),
  name TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'draft',
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0
);

-- 6. Enable Row-Level Security (RLS)
ALTER TABLE followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

-- 7. Define CRUD Policies for RLS
-- Followups
DROP POLICY IF EXISTS "Users can manage their own followups" ON followups;
CREATE POLICY "Users can manage their own followups" ON followups
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Tasks
DROP POLICY IF EXISTS "Users can manage their own tasks" ON tasks;
CREATE POLICY "Users can manage their own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Activities
DROP POLICY IF EXISTS "Users can manage their own activities" ON activities;
CREATE POLICY "Users can manage their own activities" ON activities
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Email Campaigns
DROP POLICY IF EXISTS "Users can manage their own email_campaigns" ON email_campaigns;
CREATE POLICY "Users can manage their own email_campaigns" ON email_campaigns
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. Enable Realtime Replication
-- Note: If publication additions throw an error due to already being in the publication, they can be safely ignored.
ALTER PUBLICATION supabase_realtime ADD TABLE followups;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE activities;
ALTER PUBLICATION supabase_realtime ADD TABLE email_campaigns;
