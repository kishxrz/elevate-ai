-- ============================================================
-- PHASE 9 PATCH — Fix org loading for authenticated users
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Fix is_org_member to set safe search_path
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
END;
$$;

-- 2. Fix is_org_admin_or_owner to set safe search_path
CREATE OR REPLACE FUNCTION is_org_admin_or_owner(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = auth.uid() AND role IN ('Owner', 'Admin')
  );
END;
$$;

-- 3. Fix is_org_manager_or_higher to set safe search_path
CREATE OR REPLACE FUNCTION is_org_manager_or_higher(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = auth.uid() AND role IN ('Owner', 'Admin', 'Manager')
  );
END;
$$;

-- 4. NEW: get_my_organizations() — returns the full organization rows for the current user
-- This bypasses the PostgREST RLS join issue entirely
CREATE OR REPLACE FUNCTION get_my_organizations()
RETURNS SETOF organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT o.*
    FROM public.organizations o
    INNER JOIN public.organization_members m
      ON m.organization_id = o.id
    WHERE m.user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_organizations() TO authenticated;

-- 5. NEW: get_my_organization_memberships() — returns memberships with role for the current user
CREATE OR REPLACE FUNCTION get_my_organization_memberships()
RETURNS TABLE(
  membership_id UUID,
  organization_id UUID,
  role TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT m.id, m.organization_id, m.role, m.created_at
    FROM public.organization_members m
    WHERE m.user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_organization_memberships() TO authenticated;
