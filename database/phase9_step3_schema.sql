-- Phase 9 Step 3 — Team Invitations & Membership Management Schema Migration

-- 1. Alter organization_invitations table to add new columns
ALTER TABLE organization_invitations ADD COLUMN IF NOT EXISTS token UUID DEFAULT gen_random_uuid();
ALTER TABLE organization_invitations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days');
ALTER TABLE organization_invitations ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- 2. Drop old status check constraint if it exists and add the new one
ALTER TABLE organization_invitations DROP CONSTRAINT IF EXISTS organization_invitations_status_check;
ALTER TABLE organization_invitations ADD CONSTRAINT organization_invitations_status_check 
  CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'revoked'));

-- 3. Create helper for role checking to avoid recursion
CREATE OR REPLACE FUNCTION is_org_admin_or_owner_non_recursive(org_id UUID, user_uid UUID)
RETURNS BOOLEAN SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = user_uid AND role IN ('Owner', 'Admin')
  );
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION is_org_admin_or_owner_non_recursive(UUID, UUID) TO authenticated;

-- 4. Drop old policies on organization_members and organization_invitations
DROP POLICY IF EXISTS "Users can view members in their orgs" ON organization_members;
DROP POLICY IF EXISTS "Owners and Admins can manage members in their orgs" ON organization_members;
DROP POLICY IF EXISTS "Users can view invites related to their email or org" ON organization_invitations;
DROP POLICY IF EXISTS "Owners, Admins and Managers can manage invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Owners and Admins can manage invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Members can view invitations for their org" ON organization_invitations;
DROP POLICY IF EXISTS "Users can view invitations addressed to their email" ON organization_invitations;
DROP POLICY IF EXISTS "Users can accept or decline invitations addressed to their email" ON organization_invitations;
DROP POLICY IF EXISTS "Select invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Update invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Delete invitations" ON organization_invitations;
DROP POLICY IF EXISTS "Insert invitations" ON organization_invitations;

-- 5. Define new RLS policies for organization_members
CREATE POLICY "Users can view members in their orgs" ON organization_members
  FOR SELECT USING (organization_id = ANY(get_my_org_ids()));

CREATE POLICY "Owners and Admins can manage members in their orgs" ON organization_members
  FOR ALL USING (is_org_admin_or_owner_non_recursive(organization_id, auth.uid()))
  WITH CHECK (is_org_admin_or_owner_non_recursive(organization_id, auth.uid()));

-- 6. Define new RLS policies for organization_invitations
CREATE POLICY "Select invitations" ON organization_invitations
  FOR SELECT USING (
    organization_id = ANY(get_my_org_ids())
    OR email = (auth.jwt() ->> 'email')
    OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Owners and Admins can manage invitations" ON organization_invitations
  FOR ALL USING (is_org_admin_or_owner_non_recursive(organization_id, auth.uid()))
  WITH CHECK (is_org_admin_or_owner_non_recursive(organization_id, auth.uid()));

CREATE POLICY "Users can accept or decline invitations addressed to their email" ON organization_invitations
  FOR UPDATE USING (
    email = (auth.jwt() ->> 'email')
    OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  ) WITH CHECK (
    status IN ('accepted', 'declined')
  );

-- 7. Define RPC function for accepting invitations securely
CREATE OR REPLACE FUNCTION accept_organization_invitation(p_invitation_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_email TEXT;
  v_role TEXT;
  v_status TEXT;
  v_user_id UUID;
  v_org_name TEXT;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch invitation details
  SELECT organization_id, email, role, status
  INTO v_org_id, v_email, v_role, v_status
  FROM public.organization_invitations
  WHERE id = p_invitation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  -- Verify it is pending
  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Invitation is not pending (status: %)', v_status;
  END IF;

  -- Verify email matches auth user email
  IF lower(v_email) != lower(COALESCE(auth.jwt() ->> 'email', (SELECT email FROM public.profiles WHERE id = v_user_id))) THEN
    RAISE EXCEPTION 'Invitation email does not match user email';
  END IF;

  -- Insert/update organization_members record
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (v_org_id, v_user_id, v_role)
  ON CONFLICT (organization_id, user_id) 
  DO UPDATE SET role = EXCLUDED.role;

  -- Mark invitation accepted
  UPDATE public.organization_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = p_invitation_id;

  -- Get organization name
  SELECT name INTO v_org_name FROM public.organizations WHERE id = v_org_id;

  -- Create audit log
  INSERT INTO public.organization_audit_logs (organization_id, user_id, action, resource_type, resource_id, metadata)
  VALUES (v_org_id, v_user_id, 'Invitation Accepted', 'organization_invitations', p_invitation_id, jsonb_build_object('email', v_email, 'role', v_role));

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_org_id,
    'organization_name', v_org_name,
    'role', v_role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION accept_organization_invitation(UUID) TO authenticated;

-- 8. Define RPC function for declining invitations securely
CREATE OR REPLACE FUNCTION decline_organization_invitation(p_invitation_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_email TEXT;
  v_status TEXT;
  v_user_id UUID;
BEGIN
  -- Get current authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch invitation details
  SELECT organization_id, email, status
  INTO v_org_id, v_email, v_status
  FROM public.organization_invitations
  WHERE id = p_invitation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  -- Verify it is pending
  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Invitation is not pending (status: %)', v_status;
  END IF;

  -- Verify email matches auth user email
  IF lower(v_email) != lower(COALESCE(auth.jwt() ->> 'email', (SELECT email FROM public.profiles WHERE id = v_user_id))) THEN
    RAISE EXCEPTION 'Invitation email does not match user email';
  END IF;

  -- Update status to declined
  UPDATE public.organization_invitations
  SET status = 'declined'
  WHERE id = p_invitation_id;

  -- Create audit log
  INSERT INTO public.organization_audit_logs (organization_id, user_id, action, resource_type, resource_id, metadata)
  VALUES (v_org_id, v_user_id, 'Invitation Declined', 'organization_invitations', p_invitation_id, jsonb_build_object('email', v_email));

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION decline_organization_invitation(UUID) TO authenticated;
