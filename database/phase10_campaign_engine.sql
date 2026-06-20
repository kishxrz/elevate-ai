-- Phase 10 Step 1 — Outbound Campaign System Schema Upgrades

-- 1. Upgrade campaigns table
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS subject TEXT NOT NULL DEFAULT '';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS body TEXT NOT NULL DEFAULT '';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS bounce_count INTEGER DEFAULT 0;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0;

-- Update status check constraint for campaigns
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_status_check CHECK (status IN ('draft', 'scheduled', 'paused', 'sending', 'sent', 'completed', 'failed'));

-- 2. Upgrade campaign_recipients table
ALTER TABLE public.campaign_recipients ADD COLUMN IF NOT EXISTS email TEXT;

-- Update status check constraint for campaign_recipients
ALTER TABLE public.campaign_recipients DROP CONSTRAINT IF EXISTS campaign_recipients_status_check;
ALTER TABLE public.campaign_recipients ADD CONSTRAINT campaign_recipients_status_check CHECK (status IN ('pending', 'sent', 'opened', 'clicked', 'replied', 'bounced'));

-- 3. Upgrade campaign_events table
ALTER TABLE public.campaign_events ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES public.campaign_recipients(id) ON DELETE CASCADE;
ALTER TABLE public.campaign_events ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Update event_type check constraint for campaign_events
ALTER TABLE public.campaign_events DROP CONSTRAINT IF EXISTS campaign_events_event_type_check;
ALTER TABLE public.campaign_events ADD CONSTRAINT campaign_events_event_type_check CHECK (event_type IN ('sent', 'opened', 'clicked', 'replied', 'bounced'));

-- 4. Set default values for audit log operations
-- Ensure RLS is active on campaign tables
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;

-- Recreate row-level security policies based on organization_id
DROP POLICY IF EXISTS "Users can manage campaigns in their organization" ON public.campaigns;
CREATE POLICY "Users can manage campaigns in their organization" ON public.campaigns
  FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "Users can manage campaign_recipients in their organization" ON public.campaign_recipients;
CREATE POLICY "Users can manage campaign_recipients in their organization" ON public.campaign_recipients
  FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "Users can manage campaign_events in their organization" ON public.campaign_events;
CREATE POLICY "Users can manage campaign_events in their organization" ON public.campaign_events
  FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
