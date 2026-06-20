-- ============================================================
-- PHASE 9 RLS FIX — Solve RLS recursion and select/insert issues
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create a safe, non-recursive helper to fetch the user's organization IDs
CREATE OR REPLACE FUNCTION get_my_org_ids()
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN ARRAY(
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_org_ids() TO authenticated;

-- 2. Drop old policies that caused recursion/failures
DROP POLICY IF EXISTS "Users can read orgs they belong to" ON organizations;
DROP POLICY IF EXISTS "Users can view members in their orgs" ON organization_members;
DROP POLICY IF EXISTS "Owners and Admins can manage members in their orgs" ON organization_members;
DROP POLICY IF EXISTS "Users can view invites related to their email or org" ON organization_invitations;
DROP POLICY IF EXISTS "Owners, Admins and Managers can manage invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Members can view audit logs for their org" ON organization_audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON organization_audit_logs;
DROP POLICY IF EXISTS "Members can view metrics for their org" ON organization_metrics;
DROP POLICY IF EXISTS "System can manage metrics" ON organization_metrics;
DROP POLICY IF EXISTS "Users can manage leads in their organization" ON leads;
DROP POLICY IF EXISTS "Users can manage deals in their organization" ON deals;
DROP POLICY IF EXISTS "Users can manage appointments in their organization" ON appointments;
DROP POLICY IF EXISTS "Users can manage tasks in their organization" ON tasks;
DROP POLICY IF EXISTS "Users can manage campaigns in their organization" ON campaigns;
DROP POLICY IF EXISTS "Users can manage proposals in their organization" ON proposals;
DROP POLICY IF EXISTS "Users can manage contracts in their organization" ON contracts;
DROP POLICY IF EXISTS "Users can manage revenue_forecasts in their organization" ON revenue_forecasts;
DROP POLICY IF EXISTS "Users can manage outreach_sequences in their organization" ON outreach_sequences;
DROP POLICY IF EXISTS "Users can manage followups in their organization" ON followups;
DROP POLICY IF EXISTS "Users can manage activities in their organization" ON activities;
DROP POLICY IF EXISTS "Users can manage deal_activities in their organization" ON deal_activities;
DROP POLICY IF EXISTS "Users can manage agent_tasks in their organization" ON agent_tasks;
DROP POLICY IF EXISTS "Users can manage agent_memories in their organization" ON agent_memories;
DROP POLICY IF EXISTS "Users can manage agent_executions in their organization" ON agent_executions;

-- 3. Re-create clean, array-lookup RLS policies

-- organizations
CREATE POLICY "Users can read orgs they belong to" ON organizations
  FOR SELECT USING (id = ANY(get_my_org_ids()));

-- organization_members
CREATE POLICY "Users can view members in their orgs" ON organization_members
  FOR SELECT USING (organization_id = ANY(get_my_org_ids()));

CREATE POLICY "Owners and Admins can manage members in their orgs" ON organization_members
  FOR ALL USING (organization_id = ANY(get_my_org_ids()));

-- organization_invitations
CREATE POLICY "Users can view invites related to their email or org" ON organization_invitations
  FOR SELECT USING (
    email = (SELECT email FROM public.profiles WHERE id = auth.uid()) 
    OR organization_id = ANY(get_my_org_ids())
  );

CREATE POLICY "Owners, Admins and Managers can manage invitations" ON organization_invitations
  FOR ALL USING (organization_id = ANY(get_my_org_ids()));

-- organization_audit_logs
CREATE POLICY "Members can view audit logs for their org" ON organization_audit_logs
  FOR SELECT USING (organization_id = ANY(get_my_org_ids()));

CREATE POLICY "System can insert audit logs" ON organization_audit_logs
  FOR INSERT WITH CHECK (organization_id = ANY(get_my_org_ids()));

-- organization_metrics
CREATE POLICY "Members can view metrics for their org" ON organization_metrics
  FOR SELECT USING (organization_id = ANY(get_my_org_ids()));

CREATE POLICY "System can manage metrics" ON organization_metrics
  FOR ALL USING (organization_id = ANY(get_my_org_ids()));

-- leads
CREATE POLICY "Users can manage leads in their organization" ON leads
  FOR ALL USING (organization_id = ANY(get_my_org_ids())) WITH CHECK (organization_id = ANY(get_my_org_ids()));

-- deals
CREATE POLICY "Users can manage deals in their organization" ON deals
  FOR ALL USING (organization_id = ANY(get_my_org_ids())) WITH CHECK (organization_id = ANY(get_my_org_ids()));

-- appointments
CREATE POLICY "Users can manage appointments in their organization" ON appointments
  FOR ALL USING (organization_id = ANY(get_my_org_ids())) WITH CHECK (organization_id = ANY(get_my_org_ids()));

-- tasks
CREATE POLICY "Users can manage tasks in their organization" ON tasks
  FOR ALL USING (organization_id = ANY(get_my_org_ids())) WITH CHECK (organization_id = ANY(get_my_org_ids()));

-- campaigns
CREATE POLICY "Users can manage campaigns in their organization" ON campaigns
  FOR ALL USING (organization_id = ANY(get_my_org_ids())) WITH CHECK (organization_id = ANY(get_my_org_ids()));

-- proposals
CREATE POLICY "Users can manage proposals in their organization" ON proposals
  FOR ALL USING (organization_id = ANY(get_my_org_ids())) WITH CHECK (organization_id = ANY(get_my_org_ids()));

-- contracts
CREATE POLICY "Users can manage contracts in their organization" ON contracts
  FOR ALL USING (organization_id = ANY(get_my_org_ids())) WITH CHECK (organization_id = ANY(get_my_org_ids()));

-- revenue_forecasts
CREATE POLICY "Users can manage revenue_forecasts in their organization" ON revenue_forecasts
  FOR ALL USING (organization_id = ANY(get_my_org_ids())) WITH CHECK (organization_id = ANY(get_my_org_ids()));

-- outreach_sequences
CREATE POLICY "Users can manage outreach_sequences in their organization" ON outreach_sequences
  FOR ALL USING (organization_id = ANY(get_my_org_ids())) WITH CHECK (organization_id = ANY(get_my_org_ids()));

-- followups
CREATE POLICY "Users can manage followups in their organization" ON followups
  FOR ALL USING (organization_id = ANY(get_my_org_ids())) WITH CHECK (organization_id = ANY(get_my_org_ids()));

-- activities
CREATE POLICY "Users can manage activities in their organization" ON activities
  FOR ALL USING (organization_id = ANY(get_my_org_ids())) WITH CHECK (organization_id = ANY(get_my_org_ids()));

-- deal_activities
CREATE POLICY "Users can manage deal_activities in their organization" ON deal_activities
  FOR ALL USING (organization_id = ANY(get_my_org_ids())) WITH CHECK (organization_id = ANY(get_my_org_ids()));

-- agent_tasks
CREATE POLICY "Users can manage agent_tasks in their organization" ON agent_tasks
  FOR ALL USING (organization_id = ANY(get_my_org_ids())) WITH CHECK (organization_id = ANY(get_my_org_ids()));

-- agent_memories
CREATE POLICY "Users can manage agent_memories in their organization" ON agent_memories
  FOR ALL USING (organization_id = ANY(get_my_org_ids())) WITH CHECK (organization_id = ANY(get_my_org_ids()));

-- agent_executions
CREATE POLICY "Users can manage agent_executions in their organization" ON agent_executions
  FOR ALL USING (organization_id = ANY(get_my_org_ids())) WITH CHECK (organization_id = ANY(get_my_org_ids()));
