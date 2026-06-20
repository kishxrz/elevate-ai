-- Phase 8 — Revenue Intelligence, Deal Management & AI Proposal Engine Database Migrations

-- 1. Create deals table
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID DEFAULT auth.uid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  title TEXT,
  value NUMERIC,
  stage TEXT,
  close_probability INTEGER,
  risk_level TEXT,
  expected_close_date DATE,
  status TEXT DEFAULT 'open',
  notes TEXT,
  source TEXT,
  owner_id UUID DEFAULT auth.uid()
);

-- 2. Create deal_activities table
CREATE TABLE IF NOT EXISTS deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  activity_type TEXT, -- 'Call', 'Email', 'Meeting', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  proposal_title TEXT,
  proposal_content TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'draft',
  proposal_version INTEGER DEFAULT 1
);

-- 4. Create contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  contract_content TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  signed BOOLEAN DEFAULT FALSE,
  signed_at TIMESTAMPTZ
);

-- 5. Create revenue_forecasts table
CREATE TABLE IF NOT EXISTS revenue_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID DEFAULT auth.uid(),
  forecast_month TEXT, -- YYYY-MM formatted
  forecast_value NUMERIC,
  weighted_pipeline NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Add deal_id column to leads table for bidirectional mapping
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_id UUID REFERENCES deals(id) ON DELETE SET NULL;

-- 7. Enable Row-Level Security (RLS)
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_forecasts ENABLE ROW LEVEL SECURITY;

-- 8. Define CRUD Policies for RLS
-- Deals
DROP POLICY IF EXISTS "Users can manage their own deals" ON deals;
CREATE POLICY "Users can manage their own deals" ON deals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Deal Activities
DROP POLICY IF EXISTS "Users can manage their own deal_activities" ON deal_activities;
CREATE POLICY "Users can manage their own deal_activities" ON deal_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM deals 
      WHERE deals.id = deal_activities.deal_id 
      AND deals.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals 
      WHERE deals.id = deal_activities.deal_id 
      AND deals.user_id = auth.uid()
    )
  );

-- Proposals
DROP POLICY IF EXISTS "Users can manage their own proposals" ON proposals;
CREATE POLICY "Users can manage their own proposals" ON proposals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM deals 
      WHERE deals.id = proposals.deal_id 
      AND deals.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals 
      WHERE deals.id = proposals.deal_id 
      AND deals.user_id = auth.uid()
    )
  );

-- Contracts
DROP POLICY IF EXISTS "Users can manage their own contracts" ON contracts;
CREATE POLICY "Users can manage their own contracts" ON contracts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM deals 
      WHERE deals.id = contracts.deal_id 
      AND deals.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals 
      WHERE deals.id = contracts.deal_id 
      AND deals.user_id = auth.uid()
    )
  );

-- Revenue Forecasts
DROP POLICY IF EXISTS "Users can manage their own revenue_forecasts" ON revenue_forecasts;
CREATE POLICY "Users can manage their own revenue_forecasts" ON revenue_forecasts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9. Enable Realtime Replication for Realtime updates
ALTER PUBLICATION supabase_realtime ADD TABLE deals;
ALTER PUBLICATION supabase_realtime ADD TABLE deal_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE revenue_forecasts;
