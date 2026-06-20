-- Phase 7A — Autonomous AI Sales Agent Database Migrations

-- 1. Create agent_tasks table
CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID DEFAULT auth.uid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL, -- 'outreach_email', 'followup', 'campaign_launch', etc.
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending_approval', -- 'pending_approval', 'approved', 'rejected', 'completed', 'failed'
  draft_data JSONB, -- holds subject, body, and metadata
  logs TEXT,
  reasoning TEXT
);

-- 2. Create agent_memories table
CREATE TABLE IF NOT EXISTS agent_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID DEFAULT auth.uid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL, -- 'pain_point', 'objection', 'general_context', etc.
  content TEXT NOT NULL
);

-- 3. Create agent_executions table
CREATE TABLE IF NOT EXISTS agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID DEFAULT auth.uid(),
  task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g. 'send_email', 'launch_campaign'
  status TEXT NOT NULL, -- 'success', 'failure'
  logs TEXT
);

-- 4. Enable Row-Level Security (RLS)
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;

-- 5. Define CRUD Policies for RLS
-- Agent Tasks
DROP POLICY IF EXISTS "Users can manage their own agent_tasks" ON agent_tasks;
CREATE POLICY "Users can manage their own agent_tasks" ON agent_tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Agent Memories
DROP POLICY IF EXISTS "Users can manage their own agent_memories" ON agent_memories;
CREATE POLICY "Users can manage their own agent_memories" ON agent_memories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Agent Executions
DROP POLICY IF EXISTS "Users can manage their own agent_executions" ON agent_executions;
CREATE POLICY "Users can manage their own agent_executions" ON agent_executions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE agent_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_memories;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_executions;
