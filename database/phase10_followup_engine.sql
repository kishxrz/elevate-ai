-- Phase 10 Step 2 — Autonomous Follow-Up Engine Schema Upgrades

-- 1. Create followup_sequences table
CREATE TABLE IF NOT EXISTS public.followup_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create followup_steps table
CREATE TABLE IF NOT EXISTS public.followup_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.followup_sequences(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  delay_days INTEGER NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN ('initial', 'followup', 'case_study', 'meeting_request', 'breakup')),
  subject_template TEXT,
  body_template TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create followup_executions table
CREATE TABLE IF NOT EXISTS public.followup_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES public.followup_sequences(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.followup_steps(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'sent', 'waiting_reply', 'replied', 'cancelled', 'failed', 'completed')),
  scheduled_for TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  email_subject TEXT,
  email_body TEXT,
  context_snapshot JSONB,
  influenced_revenue NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.followup_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_executions ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies
DROP POLICY IF EXISTS "Users can manage followup_sequences in their organization" ON public.followup_sequences;
CREATE POLICY "Users can manage followup_sequences in their organization" ON public.followup_sequences
  FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "Users can manage followup_steps in their organization" ON public.followup_steps;
CREATE POLICY "Users can manage followup_steps in their organization" ON public.followup_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.followup_sequences 
      WHERE public.followup_sequences.id = sequence_id 
      AND is_org_member(organization_id)
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.followup_sequences 
      WHERE public.followup_sequences.id = sequence_id 
      AND is_org_member(organization_id)
    )
  );

DROP POLICY IF EXISTS "Users can manage followup_executions in their organization" ON public.followup_executions;
CREATE POLICY "Users can manage followup_executions in their organization" ON public.followup_executions
  FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
