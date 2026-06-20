// Centralized Role-Based Access Control (RBAC) Utility for Elevate AI

export const ROLES = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  SALES_REP: "Sales Rep",
  VIEWER: "Viewer",
};

export const PERMISSIONS = {
  // Members & Org management
  MANAGE_WORKSPACE: "manage_workspace",
  MANAGE_TEAM: "manage_team",
  VIEW_TEAM: "view_team",
  INVITE_MEMBERS: "invite_members",
  CHANGE_ROLES: "change_roles",
  REMOVE_MEMBERS: "remove_members",
  MANAGE_BILLING: "manage_billing",
  
  // Leads CRM Operations
  VIEW_LEADS: "view_leads",
  CREATE_LEADS: "create_leads",
  EDIT_LEADS: "edit_leads",
  DELETE_LEADS: "delete_leads",

  // Deals CRM Operations
  VIEW_DEALS: "view_deals",
  CREATE_DEALS: "create_deals",
  EDIT_DEALS: "edit_deals",
  DELETE_DEALS: "delete_deals",

  // Campaigns Operations
  VIEW_CAMPAIGNS: "view_campaigns",
  CREATE_CAMPAIGNS: "create_campaigns",
  SEND_CAMPAIGNS: "send_campaigns",

  // Followups Operations
  VIEW_FOLLOWUPS: "view_followups",
  CREATE_FOLLOWUPS: "create_followups",
  EXECUTE_FOLLOWUPS: "execute_followups",

  // Proposals Operations
  VIEW_PROPOSALS: "view_proposals",
  GENERATE_PROPOSALS: "generate_proposals",
  EDIT_PROPOSALS: "edit_proposals",

  // Contracts Operations
  VIEW_CONTRACTS: "view_contracts",
  GENERATE_CONTRACTS: "generate_contracts",
  EDIT_CONTRACTS: "edit_contracts",

  // Core Tools & AI
  VIEW_ANALYTICS: "view_analytics",
  RUN_AI_AGENT: "run_ai_agent",
  EXECUTE_AGENT_TASKS: "execute_agent_tasks",
  BOOK_MEETINGS: "book_meetings",
};

// Define role-based permission inheritance hierarchy: Viewer < Sales Rep < Manager < Admin < Owner
const ROLE_HIERARCHY = {
  [ROLES.VIEWER]: [
    PERMISSIONS.VIEW_LEADS,
    PERMISSIONS.VIEW_DEALS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_PROPOSALS,
    PERMISSIONS.VIEW_CONTRACTS,
    PERMISSIONS.VIEW_TEAM,
    PERMISSIONS.VIEW_CAMPAIGNS,
    PERMISSIONS.VIEW_FOLLOWUPS,
  ],
  [ROLES.SALES_REP]: [
    // Inherit from Viewer
    PERMISSIONS.VIEW_LEADS,
    PERMISSIONS.VIEW_DEALS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_PROPOSALS,
    PERMISSIONS.VIEW_CONTRACTS,
    PERMISSIONS.VIEW_TEAM,
    PERMISSIONS.VIEW_CAMPAIGNS,
    // Add Sales Rep Specifics
    PERMISSIONS.CREATE_LEADS,
    PERMISSIONS.EDIT_LEADS,
    PERMISSIONS.CREATE_DEALS,
    PERMISSIONS.EDIT_DEALS,
    PERMISSIONS.BOOK_MEETINGS,
    PERMISSIONS.GENERATE_PROPOSALS,
    PERMISSIONS.GENERATE_CONTRACTS,
    PERMISSIONS.CREATE_CAMPAIGNS,
    PERMISSIONS.VIEW_FOLLOWUPS,
    PERMISSIONS.CREATE_FOLLOWUPS,
  ],
  [ROLES.MANAGER]: [
    // Inherit from Sales Rep
    PERMISSIONS.VIEW_LEADS,
    PERMISSIONS.VIEW_DEALS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_PROPOSALS,
    PERMISSIONS.VIEW_CONTRACTS,
    PERMISSIONS.VIEW_TEAM,
    PERMISSIONS.CREATE_LEADS,
    PERMISSIONS.EDIT_LEADS,
    PERMISSIONS.CREATE_DEALS,
    PERMISSIONS.EDIT_DEALS,
    PERMISSIONS.BOOK_MEETINGS,
    PERMISSIONS.GENERATE_PROPOSALS,
    PERMISSIONS.GENERATE_CONTRACTS,
    // Add Manager Specifics
    PERMISSIONS.DELETE_LEADS,
    PERMISSIONS.DELETE_DEALS,
    PERMISSIONS.VIEW_CAMPAIGNS,
    PERMISSIONS.CREATE_CAMPAIGNS,
    PERMISSIONS.SEND_CAMPAIGNS,
    PERMISSIONS.EDIT_PROPOSALS,
    PERMISSIONS.EDIT_CONTRACTS,
    PERMISSIONS.RUN_AI_AGENT,
    PERMISSIONS.EXECUTE_AGENT_TASKS,
    PERMISSIONS.INVITE_MEMBERS,
    PERMISSIONS.VIEW_FOLLOWUPS,
    PERMISSIONS.CREATE_FOLLOWUPS,
    PERMISSIONS.EXECUTE_FOLLOWUPS,
  ],
  [ROLES.ADMIN]: [
    // Inherit from Manager
    PERMISSIONS.VIEW_LEADS,
    PERMISSIONS.VIEW_DEALS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_PROPOSALS,
    PERMISSIONS.VIEW_CONTRACTS,
    PERMISSIONS.VIEW_TEAM,
    PERMISSIONS.CREATE_LEADS,
    PERMISSIONS.EDIT_LEADS,
    PERMISSIONS.CREATE_DEALS,
    PERMISSIONS.EDIT_DEALS,
    PERMISSIONS.BOOK_MEETINGS,
    PERMISSIONS.GENERATE_PROPOSALS,
    PERMISSIONS.GENERATE_CONTRACTS,
    PERMISSIONS.DELETE_LEADS,
    PERMISSIONS.DELETE_DEALS,
    PERMISSIONS.VIEW_CAMPAIGNS,
    PERMISSIONS.CREATE_CAMPAIGNS,
    PERMISSIONS.SEND_CAMPAIGNS,
    PERMISSIONS.EDIT_PROPOSALS,
    PERMISSIONS.EDIT_CONTRACTS,
    PERMISSIONS.RUN_AI_AGENT,
    PERMISSIONS.EXECUTE_AGENT_TASKS,
    PERMISSIONS.INVITE_MEMBERS,
    PERMISSIONS.VIEW_FOLLOWUPS,
    PERMISSIONS.CREATE_FOLLOWUPS,
    PERMISSIONS.EXECUTE_FOLLOWUPS,
    // Add Admin Specifics
    PERMISSIONS.MANAGE_TEAM,
    PERMISSIONS.CHANGE_ROLES,
    PERMISSIONS.REMOVE_MEMBERS,
    PERMISSIONS.MANAGE_WORKSPACE,
  ],
  [ROLES.OWNER]: [
    // Inherit all Admin
    PERMISSIONS.VIEW_LEADS,
    PERMISSIONS.VIEW_DEALS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_PROPOSALS,
    PERMISSIONS.VIEW_CONTRACTS,
    PERMISSIONS.VIEW_TEAM,
    PERMISSIONS.CREATE_LEADS,
    PERMISSIONS.EDIT_LEADS,
    PERMISSIONS.CREATE_DEALS,
    PERMISSIONS.EDIT_DEALS,
    PERMISSIONS.BOOK_MEETINGS,
    PERMISSIONS.GENERATE_PROPOSALS,
    PERMISSIONS.GENERATE_CONTRACTS,
    PERMISSIONS.DELETE_LEADS,
    PERMISSIONS.DELETE_DEALS,
    PERMISSIONS.VIEW_CAMPAIGNS,
    PERMISSIONS.CREATE_CAMPAIGNS,
    PERMISSIONS.SEND_CAMPAIGNS,
    PERMISSIONS.EDIT_PROPOSALS,
    PERMISSIONS.EDIT_CONTRACTS,
    PERMISSIONS.RUN_AI_AGENT,
    PERMISSIONS.EXECUTE_AGENT_TASKS,
    PERMISSIONS.INVITE_MEMBERS,
    PERMISSIONS.VIEW_FOLLOWUPS,
    PERMISSIONS.CREATE_FOLLOWUPS,
    PERMISSIONS.EXECUTE_FOLLOWUPS,
    PERMISSIONS.MANAGE_TEAM,
    PERMISSIONS.CHANGE_ROLES,
    PERMISSIONS.REMOVE_MEMBERS,
    PERMISSIONS.MANAGE_WORKSPACE,
    // Add Owner Specifics
    PERMISSIONS.MANAGE_BILLING,
  ]
};

/**
 * Checks if a role has permission to execute an action.
 */
export function hasPermission(role, permission) {
  if (!role) return false;
  const permissions = ROLE_HIERARCHY[role] || [];
  return permissions.includes(permission);
}

/**
 * Checks if a user has access to perform write/edit operations on a specific resource,
 * factoring in both general permission rules and ownership constraints (e.g. Sales Reps).
 */
export function canAccessResource(role, userId, resource, permission) {
  if (!role || !userId) return false;
  
  // 1. General permission check first
  if (!hasPermission(role, permission)) return false;

  // 2. Owner, Admin, and Manager can access any record in their organization
  if (role === ROLES.OWNER || role === ROLES.ADMIN || role === ROLES.MANAGER) {
    return true;
  }

  // 3. Sales Rep: Can only edit/write their own/assigned records
  if (role === ROLES.SALES_REP) {
    if (!resource) return true; // Generic permission check without instance
    
    // Check if the user is the owner/creator
    const isOwner = 
      resource.owner_id === userId || 
      resource.user_id === userId || 
      resource.assigned_to === userId ||
      (resource.leads && (resource.leads.owner_id === userId || resource.leads.user_id === userId));
      
    return !!isOwner;
  }

  return false;
}
