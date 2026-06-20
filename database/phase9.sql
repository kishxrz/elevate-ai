-- Phase 9 — Multi-Tenant Organization & Team Platform Database Migrations

-- 1. Create organizations table with billing/subscription fields
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  industry TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#C5A028',
  custom_domain TEXT,
  plan TEXT DEFAULT 'free', -- 'free', 'growth', 'enterprise'
  subscription_status TEXT DEFAULT 'active', -- 'trialing', 'active', 'past_due', 'canceled'
  stripe_customer_id TEXT,
  razorpay_customer_id TEXT,
  trial_ends_at TIMESTAMPTZ,
  seat_limit INTEGER DEFAULT 5,
  ai_credit_limit INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('Owner', 'Admin', 'Manager', 'Sales Rep', 'Viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- 3. Create organization_invitations table
CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Owner', 'Admin', 'Manager', 'Sales Rep', 'Viewer')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create organization_audit_logs table
CREATE TABLE IF NOT EXISTS organization_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create organization_metrics table (Aggregation cache layer)
CREATE TABLE IF NOT EXISTS organization_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  mrr NUMERIC DEFAULT 0,
  pipeline_value NUMERIC DEFAULT 0,
  won_revenue NUMERIC DEFAULT 0,
  lost_revenue NUMERIC DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  lead_velocity NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Centralized RLS Helper Functions
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_org_admin_or_owner(org_id UUID)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = auth.uid() AND role IN ('Owner', 'Admin')
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION is_org_manager_or_higher(org_id UUID)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = auth.uid() AND role IN ('Owner', 'Admin', 'Manager')
  );
END;
$$ LANGUAGE plpgsql;


-- 7. Add organization_id, owner_id, and deleted_at columns to business tables
-- leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- campaign_recipients
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- campaign_events
ALTER TABLE campaign_events ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- outreach_sequences
ALTER TABLE outreach_sequences ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- agent_tasks
ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- agent_memories
ALTER TABLE agent_memories ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- agent_executions
ALTER TABLE agent_executions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- revenue_forecasts
ALTER TABLE revenue_forecasts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- proposals
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- deal_activities
ALTER TABLE deal_activities ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- followups
ALTER TABLE followups ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 8. Create Indexes for query optimization
CREATE INDEX IF NOT EXISTS leads_organization_id_idx ON leads(organization_id);
CREATE INDEX IF NOT EXISTS leads_owner_id_idx ON leads(owner_id);
CREATE INDEX IF NOT EXISTS deals_organization_id_idx ON deals(organization_id);
CREATE INDEX IF NOT EXISTS deals_owner_id_idx ON deals(owner_id);
CREATE INDEX IF NOT EXISTS tasks_organization_id_idx ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS appointments_organization_id_idx ON appointments(organization_id);
CREATE INDEX IF NOT EXISTS campaigns_organization_id_idx ON campaigns(organization_id);
CREATE INDEX IF NOT EXISTS proposals_organization_id_idx ON proposals(organization_id);
CREATE INDEX IF NOT EXISTS contracts_organization_id_idx ON contracts(organization_id);
CREATE INDEX IF NOT EXISTS revenue_forecasts_organization_id_idx ON revenue_forecasts(organization_id);

-- 9. Transactional Data Migration script
DO $$
DECLARE
  u RECORD;
  org_id UUID;
  slug_text TEXT;
  full_name_text TEXT;
BEGIN
  -- Loop through all registered users in auth.users
  FOR u IN SELECT id, email, raw_user_meta_data FROM auth.users LOOP
    -- Skip if the user already belongs to an organization
    IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = u.id) THEN
      -- Resolve name
      full_name_text := COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1));
      slug_text := 'org-' || lower(regexp_replace(full_name_text, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substring(u.id::text from 1 for 8);

      -- Create Workspace Organization
      INSERT INTO public.organizations (name, slug, industry, primary_color, plan, subscription_status, seat_limit, ai_credit_limit)
      VALUES (full_name_text || ' Workspace', slug_text, 'AI Operations', '#C5A028', 'free', 'active', 5, 100)
      RETURNING id INTO org_id;

      -- Add user as the initial Owner
      INSERT INTO public.organization_members (organization_id, user_id, role)
      VALUES (org_id, u.id, 'Owner');

      -- Set default metrics cache
      INSERT INTO public.organization_metrics (organization_id, mrr, pipeline_value, won_revenue, lost_revenue, conversion_rate, lead_velocity)
      VALUES (org_id, 0, 0, 0, 0, 0, 0)
      ON CONFLICT DO NOTHING;

      -- Update business records belonging to this user
      UPDATE public.leads SET organization_id = org_id, owner_id = u.id WHERE user_id = u.id OR (user_id IS NULL AND organization_id IS NULL);
      UPDATE public.deals SET organization_id = org_id, owner_id = u.id WHERE user_id = u.id OR owner_id = u.id;
      UPDATE public.tasks SET organization_id = org_id, owner_id = u.id WHERE user_id = u.id OR owner_id = u.id;
      UPDATE public.appointments SET organization_id = org_id, owner_id = u.id WHERE user_id = u.id OR owner_id = u.id;
      UPDATE public.campaigns SET organization_id = org_id, owner_id = u.id WHERE user_id = u.id OR owner_id = u.id;
      UPDATE public.campaign_recipients SET organization_id = org_id WHERE campaign_id IN (SELECT id FROM public.campaigns WHERE organization_id = org_id);
      UPDATE public.campaign_events SET organization_id = org_id WHERE campaign_id IN (SELECT id FROM public.campaigns WHERE organization_id = org_id);
      UPDATE public.outreach_sequences SET organization_id = org_id WHERE user_id = u.id;
      UPDATE public.agent_tasks SET organization_id = org_id WHERE user_id = u.id;
      UPDATE public.agent_memories SET organization_id = org_id WHERE user_id = u.id;
      UPDATE public.agent_executions SET organization_id = org_id WHERE user_id = u.id;
      UPDATE public.revenue_forecasts SET organization_id = org_id WHERE user_id = u.id;
      UPDATE public.proposals SET organization_id = org_id WHERE deal_id IN (SELECT id FROM public.deals WHERE organization_id = org_id);
      UPDATE public.contracts SET organization_id = org_id WHERE deal_id IN (SELECT id FROM public.deals WHERE organization_id = org_id);
      UPDATE public.activities SET organization_id = org_id WHERE user_id = u.id;
      UPDATE public.deal_activities SET organization_id = org_id WHERE deal_id IN (SELECT id FROM public.deals WHERE organization_id = org_id);
      UPDATE public.followups SET organization_id = org_id WHERE lead_id IN (SELECT id FROM public.leads WHERE organization_id = org_id);
    END IF;
  END LOOP;
END;
$$;

-- 10. Enable Row-Level Security on organizations & memberships
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_metrics ENABLE ROW LEVEL SECURITY;

-- 11. Define policies for Organizations & Memberships
-- organizations
DROP POLICY IF EXISTS "Anyone authenticated can create an org" ON organizations;
CREATE POLICY "Anyone authenticated can create an org" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can read orgs they belong to" ON organizations;
CREATE POLICY "Users can read orgs they belong to" ON organizations
  FOR SELECT USING (is_org_member(id));

DROP POLICY IF EXISTS "Owners and Admins can update org settings" ON organizations;
CREATE POLICY "Owners and Admins can update org settings" ON organizations
  FOR UPDATE USING (is_org_admin_or_owner(id));

-- organization_members
DROP POLICY IF EXISTS "Users can insert themselves as Owner when creating workspace" ON organization_members;
CREATE POLICY "Users can insert themselves as Owner when creating workspace" ON organization_members
  FOR INSERT WITH CHECK (auth.uid() = user_id AND role = 'Owner');

DROP POLICY IF EXISTS "Users can view members in their orgs" ON organization_members;
CREATE POLICY "Users can view members in their orgs" ON organization_members
  FOR SELECT USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "Owners and Admins can manage members in their orgs" ON organization_members;
CREATE POLICY "Owners and Admins can manage members in their orgs" ON organization_members
  FOR ALL USING (is_org_admin_or_owner(organization_id));

-- organization_invitations
DROP POLICY IF EXISTS "Users can view invites related to their email or org" ON organization_invitations;
CREATE POLICY "Users can view invites related to their email or org" ON organization_invitations
  FOR SELECT USING (
    email = (SELECT email FROM public.profiles WHERE id = auth.uid()) 
    OR is_org_member(organization_id)
  );

DROP POLICY IF EXISTS "Owners, Admins and Managers can manage invitations" ON organization_invitations;
CREATE POLICY "Owners, Admins and Managers can manage invitations" ON organization_invitations
  FOR ALL USING (is_org_manager_or_higher(organization_id));

-- organization_audit_logs
DROP POLICY IF EXISTS "Members can view audit logs for their org" ON organization_audit_logs;
CREATE POLICY "Members can view audit logs for their org" ON organization_audit_logs
  FOR SELECT USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "System can insert audit logs" ON organization_audit_logs;
CREATE POLICY "System can insert audit logs" ON organization_audit_logs
  FOR INSERT WITH CHECK (is_org_member(organization_id));

-- organization_metrics
DROP POLICY IF EXISTS "Members can view metrics for their org" ON organization_metrics;
CREATE POLICY "Members can view metrics for their org" ON organization_metrics
  FOR SELECT USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "System can manage metrics" ON organization_metrics;
CREATE POLICY "System can manage metrics" ON organization_metrics
  FOR ALL USING (is_org_member(organization_id));

-- 12. Apply RLS policies to existing business tables (Replaces previous policies)
-- leads
DROP POLICY IF EXISTS "Users can manage their own leads" ON leads;
DROP POLICY IF EXISTS "Users can manage leads in their organization" ON leads;
CREATE POLICY "Users can manage leads in their organization" ON leads
  FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

-- deals
DROP POLICY IF EXISTS "Users can manage their own deals" ON deals;
DROP POLICY IF EXISTS "Users can manage deals in their organization" ON deals;
CREATE POLICY "Users can manage deals in their organization" ON deals
  FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

-- appointments
DROP POLICY IF EXISTS "Users can manage their own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can manage appointments in their organization" ON appointments;
CREATE POLICY "Users can manage appointments in their organization" ON appointments
  FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

-- tasks
DROP POLICY IF EXISTS "Users can manage their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can manage tasks in their organization" ON tasks;
CREATE POLICY "Users can manage tasks in their organization" ON tasks
  FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

-- campaigns
DROP POLICY IF EXISTS "Users can manage their own campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can manage campaigns in their organization" ON campaigns;
CREATE POLICY "Users can manage campaigns in their organization" ON campaigns
  FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

-- proposals
DROP POLICY IF EXISTS "Users can manage their own proposals" ON proposals;
DROP POLICY IF EXISTS "Users can manage proposals in their organization" ON proposals;
CREATE POLICY "Users can manage proposals in their organization" ON proposals
  FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

-- contracts
DROP POLICY IF EXISTS "Users can manage their own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can manage contracts in their organization" ON contracts;
CREATE POLICY "Users can manage contracts in their organization" ON contracts
  FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

-- revenue_forecasts
DROP POLICY IF EXISTS "Users can manage their own revenue_forecasts" ON revenue_forecasts;
DROP POLICY IF EXISTS "Users can manage revenue_forecasts in their organization" ON revenue_forecasts;
CREATE POLICY "Users can manage revenue_forecasts in their organization" ON revenue_forecasts
  FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

-- outreach_sequences
DROP POLICY IF EXISTS "Users can manage their own outreach_sequences" ON outreach_sequences;
DROP POLICY IF EXISTS "Users can manage outreach_sequences in their organization" ON outreach_sequences;
CREATE POLICY "Users can manage outreach_sequences in their organization" ON outreach_sequences
  FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

-- followups
DROP POLICY IF EXISTS "Users can manage their own followups" ON followups;
DROP POLICY IF EXISTS "Users can manage followups in their organization" ON followups;
CREATE POLICY "Users can manage followups in their organization" ON followups
  FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

-- activities
DROP POLICY IF EXISTS "Users can manage their own activities" ON activities;
DROP POLICY IF EXISTS "Users can manage activities in their organization" ON activities;
CREATE POLICY "Users can manage activities in their organization" ON activities
  FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

-- deal_activities
DROP POLICY IF EXISTS "Users can manage their own deal_activities" ON deal_activities;
DROP POLICY IF EXISTS "Users can manage deal_activities in their organization" ON deal_activities;
CREATE POLICY "Users can manage deal_activities in their organization" ON deal_activities
  FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

-- agent_tasks
DROP POLICY IF EXISTS "Users can manage their own agent_tasks" ON agent_tasks;
DROP POLICY IF EXISTS "Users can manage agent_tasks in their organization" ON agent_tasks;
CREATE POLICY "Users can manage agent_tasks in their organization" ON agent_tasks
  FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

-- agent_memories
DROP POLICY IF EXISTS "Users can manage their own agent_memories" ON agent_memories;
DROP POLICY IF EXISTS "Users can manage agent_memories in their organization" ON agent_memories;
CREATE POLICY "Users can manage agent_memories in their organization" ON agent_memories
  FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

-- agent_executions
DROP POLICY IF EXISTS "Users can manage their own agent_executions" ON agent_executions;
DROP POLICY IF EXISTS "Users can manage agent_executions in their organization" ON agent_executions;
CREATE POLICY "Users can manage agent_executions in their organization" ON agent_executions
  FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

-- 13. Enable Realtime Replication for the new tables
ALTER PUBLICATION supabase_realtime ADD TABLE organizations;
ALTER PUBLICATION supabase_realtime ADD TABLE organization_members;
ALTER PUBLICATION supabase_realtime ADD TABLE organization_invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE organization_audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE organization_metrics;

-- 14. Create unified SECURITY DEFINER function for workspace creation
CREATE OR REPLACE FUNCTION create_organization_workspace(
  p_name TEXT,
  p_slug TEXT,
  p_industry TEXT DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL,
  p_primary_color TEXT DEFAULT '#C5A028'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current authenticated user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check unique slug
  IF EXISTS (
      SELECT 1
      FROM public.organizations
      WHERE slug = p_slug
  ) THEN
      RAISE EXCEPTION 'Workspace slug already exists';
  END IF;

  -- 1. Create the organization row
  INSERT INTO public.organizations (
    name,
    slug,
    industry,
    logo_url,
    primary_color,
    plan,
    subscription_status,
    seat_limit,
    ai_credit_limit
  )
  VALUES (
    p_name,
    p_slug,
    p_industry,
    p_logo_url,
    p_primary_color,
    'free',
    'active',
    5,
    100
  )
  RETURNING id INTO v_org_id;

  -- 2. Create the Owner membership row in organization_members
  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role
  )
  VALUES (
    v_org_id,
    v_user_id,
    'Owner'
  );

  -- 3. Create default organization_metrics row
  INSERT INTO public.organization_metrics (
    organization_id,
    mrr,
    pipeline_value,
    won_revenue,
    lost_revenue,
    conversion_rate,
    lead_velocity
  )
  VALUES (
    v_org_id,
    0,
    0,
    0,
    0,
    0,
    0
  );

  -- 4. Return json payload
  RETURN jsonb_build_object(
    'organization_id', v_org_id,
    'organization_name', p_name,
    'role', 'Owner'
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION create_organization_workspace(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
