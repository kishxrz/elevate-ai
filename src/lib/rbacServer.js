import { supabase } from "./supabase";
import { hasPermission } from "./rbac";

/**
 * Checks if a user has a specific permission in a given organization.
 * Queries organization_members to check their assigned role.
 */
export async function checkRoutePermission(userId, organizationId, permission) {
  if (!userId || !organizationId) return false;
  
  try {
    const { data: memberRecord, error } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();
      
    if (error || !memberRecord) {
      console.warn(`[RBAC Server] Membership record not found for user ${userId} in org ${organizationId}`);
      return false;
    }
    
    const userRole = memberRecord.role || "Viewer";
    return hasPermission(userRole, permission);
  } catch (err) {
    console.error(`[RBAC Server] Error verifying permission for user ${userId}:`, err);
    return false;
  }
}
