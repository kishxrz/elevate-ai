-- Phase 6 — AI Outreach & Campaign Engine Database Migrations

-- 1. Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID DEFAULT auth.uid(),
  name TEXT NOT NULL,
  channel TEXT DEFAULT 'email',
  status TEXT DEFAULT 'draft',
  total_leads INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  appointment_count INTEGER DEFAULT 0
);

-- 2. Create campaign_recipients table
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  subject TEXT,
  body TEXT
);

-- 3. Create campaign_events table
CREATE TABLE IF NOT EXISTS campaign_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'sent', 'opened', 'replied', 'booked_meeting'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create outreach_sequences table
CREATE TABLE IF NOT EXISTS outreach_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT auth.uid(),
  name TEXT,
  steps JSONB,
  active BOOLEAN DEFAULT true
);

-- 5. Alter leads table to add nurture_status
ALTER TABLE leads ADD COLUMN IF NOT EXISTS nurture_status TEXT DEFAULT 'Cold';

-- 6. Enable Row-Level Security (RLS)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_sequences ENABLE ROW LEVEL SECURITY;

-- 7. Define CRUD Policies for RLS
-- Campaigns
DROP POLICY IF EXISTS "Users can manage their own campaigns" ON campaigns;
CREATE POLICY "Users can manage their own campaigns" ON campaigns
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Campaign Recipients
DROP POLICY IF EXISTS "Users can manage their own campaign_recipients" ON campaign_recipients;
CREATE POLICY "Users can manage their own campaign_recipients" ON campaign_recipients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE campaigns.id = campaign_recipients.campaign_id 
      AND campaigns.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE campaigns.id = campaign_recipients.campaign_id 
      AND campaigns.user_id = auth.uid()
    )
  );

-- Campaign Events
DROP POLICY IF EXISTS "Users can manage their own campaign_events" ON campaign_events;
CREATE POLICY "Users can manage their own campaign_events" ON campaign_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE campaigns.id = campaign_events.campaign_id 
      AND campaigns.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE campaigns.id = campaign_events.campaign_id 
      AND campaigns.user_id = auth.uid()
    )
  );

-- Outreach Sequences
DROP POLICY IF EXISTS "Users can manage their own outreach_sequences" ON outreach_sequences;
CREATE POLICY "Users can manage their own outreach_sequences" ON outreach_sequences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE campaign_recipients;
ALTER PUBLICATION supabase_realtime ADD TABLE campaign_events;
ALTER PUBLICATION supabase_realtime ADD TABLE outreach_sequences;
