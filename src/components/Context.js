"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { calculateAndStoreLeadPriority } from "@/lib/leadScoring";
import { updateDealForecasts } from "@/lib/dealIntelligence";
import { hasPermission, canAccessResource, PERMISSIONS } from "@/lib/rbac";

const ElevateAppContext = createContext();

// Dynamic mock activities generators for logs
const initialLogs = [
  { id: 1, type: "system", message: "Elevate AI Engine initialized", time: "Just now" },
  { id: 2, type: "whatsapp", message: "WhatsApp Business API synced successfully", time: "2 mins ago" },
  { id: 3, type: "forms", message: "Web Form webhook active on port 443", time: "1 hour ago" },
];

export function ElevateAppProvider({ children }) {
  const creatingDealIdsRef = useRef(new Set());
  const orgChannelsRef = useRef([]);
  const [currentView, setCurrentView] = useState("home"); // home, features, solutions, pricing, demo, blog, contact, dashboard
  const [dashboardSection, setDashboardSection] = useState("overview"); // overview, leads, pipeline, ai-assistant, automations, analytics, appointments, integrations, billing, team, settings, support
  
  // Selected Industry profile in the Flagship Demo Sandbox
  const [demoIndustry, setDemoIndustry] = useState("gym"); // gym, clinic, leather, real-estate

  // --- Auth State ---
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // --- Multi-Tenant & Org State ---
  const [organizations, setOrganizations] = useState([]);
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [organizationMembers, setOrganizationMembers] = useState([]);
  const [organizationRole, setOrganizationRole] = useState("Viewer");
  const [organizationInvitations, setOrganizationInvitations] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [workspaceCache, setWorkspaceCache] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false);
  // Guard: prevents onAuthStateChange from re-fetching orgs while workspace creation is in-flight
  const isCreatingWorkspaceRef = useRef(false);

  // --- Leads State (Fetched from Supabase) ---
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [leadsError, setLeadsError] = useState(null);

  // --- Google Calendar & Appointments State ---
  const [googleConnected, setGoogleConnected] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  // --- Tasks State ---
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // --- Follow-Ups State ---
  const [followups, setFollowups] = useState([]);
  const [loadingFollowups, setLoadingFollowups] = useState(true);

  // --- Campaigns & Sequences State ---
  const [campaigns, setCampaigns] = useState([]);
  const [campaignRecipients, setCampaignRecipients] = useState([]);
  const [campaignEvents, setCampaignEvents] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  // --- Follow-Up States ---
  const [followupSequences, setFollowupSequences] = useState([]);
  const [followupSteps, setFollowupSteps] = useState([]);
  const [followupExecutions, setFollowupExecutions] = useState([]);

  // --- Agent Center State ---
  const [agentTasks, setAgentTasks] = useState([]);
  const [agentMemories, setAgentMemories] = useState([]);
  const [loadingAgentTasks, setLoadingAgentTasks] = useState(true);

  // --- Revenue Intelligence & Deal Management State ---
  const [deals, setDeals] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [loadingForecasts, setLoadingForecasts] = useState(true);

  // --- Hash Routing Persistence & Listeners ---
  useEffect(() => {
    const handleHashRouting = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        const viewMapping = {
          home: "home",
          features: "features",
          solutions: "solutions",
          pricing: "pricing",
          demo: "demo",
          sandbox: "demo",
          blog: "blog",
          contact: "contact",
          login: "login",
          dashboard: "dashboard",
        };
        const mappedView = viewMapping[hash];
        if (mappedView) {
          setCurrentView(mappedView);
        }
      }
    };

    handleHashRouting();
    window.addEventListener("hashchange", handleHashRouting);
    return () => {
      window.removeEventListener("hashchange", handleHashRouting);
    };
  }, []);

  // Update hash when currentView changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentHash = window.location.hash.replace("#", "");
      if (currentView === "home") {
        if (currentHash !== "") {
          window.location.hash = "";
        }
      } else {
        if (currentView === "demo" && currentHash === "sandbox") {
          // Keep sandbox hash alias for demo view
        } else if (currentHash !== currentView) {
          window.location.hash = currentView;
        }
      }
    }
  }, [currentView]);

  // Auto create profile in database if first time login
  const ensureProfileExists = async (authUser) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();
      
      if (error && error.code !== "PGRST116") {
        throw error;
      }
      
      if (!data) {
        const fullName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "User";
        const avatarUrl = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null;
        
        const { error: insertError } = await supabase
          .from("profiles")
          .insert([{
            id: authUser.id,
            email: authUser.email,
            full_name: fullName,
            avatar_url: avatarUrl,
          }]);
        
        if (insertError) throw insertError;
        console.log("Profile created successfully for user:", authUser.email);
      }
    } catch (err) {
      console.error("Failed to ensure user profile exists in database:", err);
    }
  };

  // Centralized Organization Scoping Helper
  const getOrgScopedQuery = (table, selectPattern = "*", activeOrgId = currentOrganization?.id) => {
    const orgId = activeOrgId || currentOrganization?.id;
    if (!orgId) {
      throw new Error("No active organization selected");
    }
    return supabase
      .from(table)
      .select(selectPattern)
      .eq("organization_id", orgId);
  };

  // --- Multi-Tenant Helpers & State Synchronization ---
  const fetchOrgMembersAndRole = async (orgId) => {
    try {
      // Try to fetch members with profiles join first
      const { data: membersData, error } = await supabase
        .from("organization_members")
        .select("*, profiles(id, full_name, email, avatar_url)")
        .eq("organization_id", orgId);
      
      if (error) {
        console.warn("[Workspace] fetchOrgMembersAndRole join failed, falling back to client-side mapping:", error.message);
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from("organization_members")
          .select("*")
          .eq("organization_id", orgId);
        if (fallbackErr) throw fallbackErr;

        if (fallbackData && fallbackData.length > 0) {
          const userIds = fallbackData.map(m => m.user_id).filter(Boolean);
          const { data: profilesData, error: profilesErr } = await supabase
            .from("profiles")
            .select("id, full_name, email, avatar_url")
            .in("id", userIds);
          
          if (!profilesErr && profilesData) {
            const profilesMap = new Map(profilesData.map(p => [p.id, p]));
            const joinedData = fallbackData.map(m => ({
              ...m,
              profiles: profilesMap.get(m.user_id) || null
            }));
            setOrganizationMembers(joinedData);
            return;
          }
        }
        setOrganizationMembers(fallbackData || []);
      } else {
        setOrganizationMembers(membersData || []);
      }
    } catch (err) {
      console.error("Failed to fetch organization members:", err);
      setOrganizationMembers([]);
    }
  };


  const fetchOrgInvitations = async (orgId) => {
    try {
      const { data: invitesData, error } = await supabase
        .from("organization_invitations")
        .select("*")
        .eq("organization_id", orgId)
        .eq("status", "pending");
      if (error) throw error;
      setOrganizationInvitations(invitesData || []);
    } catch (err) {
      console.error("Failed to fetch organization invitations:", err);
    }
  };

  const fetchPendingInvitations = async (emailAddress) => {
    if (!emailAddress) return;
    try {
      const { data, error } = await supabase
        .from("organization_invitations")
        .select("*, organizations(id, name)")
        .eq("email", emailAddress)
        .eq("status", "pending");
      if (error) throw error;
      setPendingInvitations(data || []);
    } catch (err) {
      console.error("Failed to fetch pending invitations:", err);
    }
  };

  const fetchOrgData = async (orgId, activeUser = user) => {
    const fetchUserObj = activeUser || user;
    if (!fetchUserObj) {
      console.log("[Workspace] fetchOrgData returned early: user is not set yet.");
      return;
    }
    try {
      console.log("[Workspace] Fetching data for organization:", orgId, "for user:", fetchUserObj.id);

      // 0. Re-fetch the organization row itself to keep currentOrganization fresh
      const { data: orgRow, error: orgRowErr } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .maybeSingle();
      if (orgRowErr) {
        console.error("[Workspace] Failed to refresh org row:", orgRowErr.message, orgRowErr.details);
        throw orgRowErr;
      }
      if (orgRow) {
        console.log("[Workspace] Refreshed org row:", orgRow.name, "id:", orgRow.id);
        setCurrentOrganization(orgRow);
        setOrganizations(prev => prev.map(o => o.id === orgId ? orgRow : o));
      }

      // 1. Fetch User Role in organization
      const { data: memberRecord, error: memberRecordErr } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", orgId)
        .eq("user_id", fetchUserObj.id)
        .maybeSingle();
      if (memberRecordErr) {
        console.error("[Workspace] Failed to fetch user role:", memberRecordErr.message, memberRecordErr.details);
        throw memberRecordErr;
      }
      
      const userRole = memberRecord?.role || "Viewer";
      console.log("[Workspace] Fetched user role:", userRole, "for org:", orgId);
      setOrganizationRole(userRole);

      // 2. Fetch Leads
      const { data: leadsData, error: leadsErr } = await getOrgScopedQuery("leads", "*", orgId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (leadsErr) {
        console.error("[Workspace] Failed to fetch leads:", leadsErr.message, leadsErr.details);
        throw leadsErr;
      }
      
      const formattedLeads = (leadsData || []).map((lead) => ({
        ...lead,
        date: lead.created_at ? lead.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
      }));
      setLeads(formattedLeads);
      setLoadingLeads(false);

      // 3. Fetch Deals
      const { data: dealsData, error: dealsErr } = await getOrgScopedQuery("deals", "*, leads!deals_lead_id_fkey(*)", orgId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (dealsErr) {
        console.error("[Workspace] Failed to fetch deals:", dealsErr.message, dealsErr.details);
        throw dealsErr;
      }
      setDeals(dealsData || []);
      setLoadingDeals(false);

      // 4. Fetch Tasks
      const { data: tasksData, error: tasksErr } = await getOrgScopedQuery("tasks", "*", orgId)
        .order("due_date", { ascending: true })
        .order("created_at", { ascending: false });
      if (tasksErr) {
        console.error("[Workspace] Failed to fetch tasks:", tasksErr.message, tasksErr.details);
        throw tasksErr;
      }
      setTasks(tasksData || []);
      setLoadingTasks(false);

      // 5. Fetch Appointments
      const { data: appointmentsData, error: appointmentsErr } = await getOrgScopedQuery("appointments", "*", orgId)
        .order("start_time", { ascending: true });
      if (appointmentsErr) {
        console.error("[Workspace] Failed to fetch appointments:", appointmentsErr.message, appointmentsErr.details);
        throw appointmentsErr;
      }
      
      const formattedApts = (appointmentsData || []).map(apt => ({
        ...apt,
        clientName: apt.title,
        type: apt.description,
        date: apt.start_time ? apt.start_time.split("T")[0] : "",
        time: apt.start_time ? new Date(apt.start_time).toLocaleTimeString("default", { hour: "numeric", minute: "2-digit" }) : "",
      }));
      setAppointments(formattedApts);
      setLoadingAppointments(false);

      // 6. Fetch Campaigns
      const { data: campaignsData, error: campaignsErr } = await getOrgScopedQuery("campaigns", "*", orgId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (campaignsErr) {
        console.error("[Workspace] Failed to fetch campaigns:", campaignsErr.message, campaignsErr.details);
        throw campaignsErr;
      }
      setCampaigns(campaignsData || []);

      // 6b. Fetch Campaign Recipients
      const { data: recipientsData, error: recipientsErr } = await getOrgScopedQuery("campaign_recipients", "*", orgId);
      if (recipientsErr) {
        console.error("[Workspace] Failed to fetch campaign recipients:", recipientsErr.message);
      } else {
        setCampaignRecipients(recipientsData || []);
      }

      // 6c. Fetch Campaign Events
      const { data: eventsData, error: eventsErr } = await getOrgScopedQuery("campaign_events", "*", orgId)
        .order("created_at", { ascending: false });
      if (eventsErr) {
        console.error("[Workspace] Failed to fetch campaign events:", eventsErr.message);
      } else {
        setCampaignEvents(eventsData || []);
      }
      setLoadingCampaigns(false);

      // 6d. Fetch Follow-Up Sequences, Steps, and Executions
      setLoadingFollowups(true);
      try {
        const { data: seqsData, error: seqsErr } = await getOrgScopedQuery("followup_sequences", "*", orgId)
          .order("created_at", { ascending: false });
        if (seqsErr) throw seqsErr;
        setFollowupSequences(seqsData || []);

        const seqIds = (seqsData || []).map(s => s.id);
        if (seqIds.length > 0) {
          const { data: stepsData, error: stepsErr } = await supabase
            .from("followup_steps")
            .select("*")
            .in("sequence_id", seqIds)
            .order("step_number", { ascending: true });
          if (stepsErr) throw stepsErr;
          setFollowupSteps(stepsData || []);
        } else {
          setFollowupSteps([]);
        }

        const { data: execData, error: execErr } = await getOrgScopedQuery("followup_executions", "*", orgId)
          .order("scheduled_for", { ascending: true });
        if (execErr) throw execErr;
        setFollowupExecutions(execData || []);
      } catch (err) {
        console.error("[Workspace] Failed to fetch followup data:", err.message);
      } finally {
        setLoadingFollowups(false);
      }

      // 7. Fetch proposals
      const { data: proposalsData, error: proposalsErr } = await getOrgScopedQuery("proposals", "*", orgId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (proposalsErr) {
        console.error("[Workspace] Failed to fetch proposals:", proposalsErr.message, proposalsErr.details);
        throw proposalsErr;
      }
      setProposals(proposalsData || []);
      setLoadingProposals(false);

      // 8. Fetch contracts
      const { data: contractsData, error: contractsErr } = await getOrgScopedQuery("contracts", "*", orgId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (contractsErr) {
        console.error("[Workspace] Failed to fetch contracts:", contractsErr.message, contractsErr.details);
        throw contractsErr;
      }
      setContracts(contractsData || []);
      setLoadingContracts(false);

      // 9. Fetch forecasts
      const { data: forecastsData, error: forecastsErr } = await getOrgScopedQuery("revenue_forecasts", "*", orgId)
        .order("forecast_month", { ascending: false });
      if (forecastsErr) {
        console.error("[Workspace] Failed to fetch forecasts:", forecastsErr.message, forecastsErr.details);
        throw forecastsErr;
      }
      setForecasts(forecastsData || []);
      setLoadingForecasts(false);

      // 10. Fetch Org Members (Roster)
      await fetchOrgMembersAndRole(orgId);

      // 11. Fetch Org Invitations
      await fetchOrgInvitations(orgId);

      // 12. Fetch Notifications
      try {
        const { data: notificationsData, error: notificationsErr } = await getOrgScopedQuery("notifications", "*", orgId)
          .order("created_at", { ascending: false });
        if (notificationsErr) throw notificationsErr;
        setNotifications(notificationsData || []);
      } catch (err) {
        console.warn("[Workspace] Failed to fetch notifications (may not exist):", err.message);
        setNotifications([]);
      }

    } catch (err) {
      console.error("Failed to load organization data:", err.message || err, err.details || "", err);
    }
  };

  const subscribeToOrganization = (orgId) => {
    // 1. Clean up existing channels tracked in orgChannelsRef
    orgChannelsRef.current.forEach(ch => {
      supabase.removeChannel(ch);
    });
    orgChannelsRef.current = [];

    if (!orgId) return;

    console.log(`[Subscription Manager] Subscribing to organization channels for: ${orgId}`);

    const createChannel = (table, onEvent) => {
      const channel = supabase
        .channel(`org-${table}-${orgId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `organization_id=eq.${orgId}` },
          onEvent
        )
        .subscribe();
      orgChannelsRef.current.push(channel);
      return channel;
    };

    // Setup actual handlers:
    // For Leads
    createChannel("leads", (payload) => {
      const { eventType, new: newRec, old: oldRec } = payload;
      const formatLead = (lead) => ({
        ...lead,
        date: lead.created_at ? lead.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
      });

      if (eventType === "DELETE" || (newRec && newRec.deleted_at)) {
        const deleteId = eventType === "DELETE" ? oldRec.id : newRec.id;
        setLeads((prev) => prev.filter(l => l.id !== deleteId));
      } else {
        setLeads((prev) => {
          const exists = prev.some(l => l.id === newRec.id);
          if (exists) {
            return prev.map(l => l.id === newRec.id ? formatLead(newRec) : l);
          } else {
            return [formatLead(newRec), ...prev];
          }
        });
      }
    });

    // For Deals
    createChannel("deals", async (payload) => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === "DELETE" || (newRec && newRec.deleted_at)) {
        const deleteId = eventType === "DELETE" ? oldRec.id : newRec.id;
        setDeals((prev) => prev.filter(d => d.id !== deleteId));
      } else {
        let dealWithLead = newRec;
        if (newRec.lead_id) {
          const { data: leadData } = await supabase
            .from("leads")
            .select("*")
            .eq("id", newRec.lead_id)
            .eq("organization_id", orgId)
            .single();
          dealWithLead = { ...newRec, leads: leadData };
        }
        setDeals((prev) => {
          const exists = prev.some(d => d.id === newRec.id);
          if (exists) {
            return prev.map(d => d.id === newRec.id ? dealWithLead : d);
          } else {
            return [dealWithLead, ...prev];
          }
        });
      }
    });

    // For Tasks
    createChannel("tasks", (payload) => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === "DELETE") {
        setTasks((prev) => prev.filter(t => t.id !== oldRec.id));
      } else {
        setTasks((prev) => {
          const exists = prev.some(t => t.id === newRec.id);
          if (exists) {
            return prev.map(t => t.id === newRec.id ? newRec : t);
          } else {
            return [newRec, ...prev];
          }
        });
      }
    });

    // For Appointments
    createChannel("appointments", (payload) => {
      const { eventType, new: newRec, old: oldRec } = payload;
      const formatApt = (apt) => ({
        ...apt,
        clientName: apt.title,
        type: apt.description,
        date: apt.start_time ? apt.start_time.split("T")[0] : "",
        time: apt.start_time ? new Date(apt.start_time).toLocaleTimeString("default", { hour: "numeric", minute: "2-digit" }) : "",
      });

      if (eventType === "DELETE") {
        setAppointments((prev) => prev.filter(a => a.id !== oldRec.id));
      } else {
        setAppointments((prev) => {
          const formatted = formatApt(newRec);
          const exists = prev.some(a => a.id === newRec.id);
          const next = exists ? prev.map(a => a.id === newRec.id ? formatted : a) : [...prev, formatted];
          return next.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        });
      }
    });

    // For Campaigns
    createChannel("campaigns", (payload) => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === "DELETE" || (newRec && newRec.deleted_at)) {
        const deleteId = eventType === "DELETE" ? oldRec.id : newRec.id;
        setCampaigns((prev) => prev.filter(c => c.id !== deleteId));
      } else {
        setCampaigns((prev) => {
          const exists = prev.some(c => c.id === newRec.id);
          if (exists) {
            return prev.map(c => c.id === newRec.id ? newRec : c);
          } else {
            return [newRec, ...prev];
          }
        });
      }
    });

    // For Campaign Recipients
    createChannel("campaign_recipients", (payload) => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === "DELETE") {
        setCampaignRecipients((prev) => prev.filter(r => r.id !== oldRec.id));
      } else {
        setCampaignRecipients((prev) => {
          const exists = prev.some(r => r.id === newRec.id);
          if (exists) {
            return prev.map(r => r.id === newRec.id ? newRec : r);
          } else {
            return [newRec, ...prev];
          }
        });
      }
    });

    // For Campaign Events
    createChannel("campaign_events", (payload) => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === "DELETE") {
        setCampaignEvents((prev) => prev.filter(e => e.id !== oldRec.id));
      } else {
        setCampaignEvents((prev) => {
          const exists = prev.some(e => e.id === newRec.id);
          if (exists) {
            return prev.map(e => e.id === newRec.id ? newRec : e);
          } else {
            return [newRec, ...prev];
          }
        });
      }
    });

    // For Follow-Up Sequences
    createChannel("followup_sequences", (payload) => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === "DELETE") {
        setFollowupSequences((prev) => prev.filter(s => s.id !== oldRec.id));
      } else {
        setFollowupSequences((prev) => {
          const exists = prev.some(s => s.id === newRec.id);
          return exists ? prev.map(s => s.id === newRec.id ? newRec : s) : [newRec, ...prev];
        });
      }
    });

    // For Follow-Up Steps (general table listener since no org_id exists directly)
    const stepsChannel = supabase
      .channel(`org-followup_steps-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "followup_steps" },
        (payload) => {
          const { eventType, new: newRec, old: oldRec } = payload;
          if (eventType === "DELETE") {
            setFollowupSteps((prev) => prev.filter(s => s.id !== oldRec.id));
          } else {
            setFollowupSteps((prev) => {
              const exists = prev.some(s => s.id === newRec.id);
              return exists ? prev.map(s => s.id === newRec.id ? newRec : s) : [...prev, newRec];
            });
          }
        }
      )
      .subscribe();
    orgChannelsRef.current.push(stepsChannel);

    // For Follow-Up Executions
    createChannel("followup_executions", (payload) => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === "DELETE") {
        setFollowupExecutions((prev) => prev.filter(e => e.id !== oldRec.id));
      } else {
        setFollowupExecutions((prev) => {
          const exists = prev.some(e => e.id === newRec.id);
          return exists ? prev.map(e => e.id === newRec.id ? newRec : e) : [newRec, ...prev];
        });
      }
    });

    // For Proposals
    createChannel("proposals", (payload) => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === "DELETE" || (newRec && newRec.deleted_at)) {
        const deleteId = eventType === "DELETE" ? oldRec.id : newRec.id;
        setProposals((prev) => prev.filter(p => p.id !== deleteId));
      } else {
        setProposals((prev) => {
          const exists = prev.some(p => p.id === newRec.id);
          if (exists) {
            return prev.map(p => p.id === newRec.id ? newRec : p);
          } else {
            return [newRec, ...prev];
          }
        });
      }
    });

    // For Contracts
    createChannel("contracts", (payload) => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === "DELETE" || (newRec && newRec.deleted_at)) {
        const deleteId = eventType === "DELETE" ? oldRec.id : newRec.id;
        setContracts((prev) => prev.filter(c => c.id !== deleteId));
      } else {
        setContracts((prev) => {
          const exists = prev.some(c => c.id === newRec.id);
          if (exists) {
            return prev.map(c => c.id === newRec.id ? newRec : c);
          } else {
            return [newRec, ...prev];
          }
        });
      }
    });

    // For Forecasts
    createChannel("revenue_forecasts", (payload) => {
      const { eventType, new: newRec, old: oldRec } = payload;
      if (eventType === "DELETE") {
        setForecasts((prev) => prev.filter(f => f.id !== oldRec.id));
      } else {
        setForecasts((prev) => {
          const exists = prev.some(f => f.id === newRec.id);
          if (exists) {
            return prev.map(f => f.id === newRec.id ? newRec : f);
          } else {
            return [newRec, ...prev];
          }
        });
      }
    });

    // For Member Roster & Role updates
    const membersChannel = supabase
      .channel(`org-members-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "organization_members", filter: `organization_id=eq.${orgId}` },
        () => {
          fetchOrgMembersAndRole(orgId);
        }
      )
      .subscribe();
    orgChannelsRef.current.push(membersChannel);

    // For Invitations
    const invitesChannel = supabase
      .channel(`org-invitations-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "organization_invitations", filter: `organization_id=eq.${orgId}` },
        () => {
          fetchOrgInvitations(orgId);
        }
      )
      .subscribe();
    orgChannelsRef.current.push(invitesChannel);

    // For Notifications
    createChannel("notifications", (payload) => {
      const { eventType, new: newRec, old: oldRec } = payload;
      console.log("[Subscription Manager] Received notification event:", payload);
      if (eventType === "DELETE") {
        setNotifications((prev) => prev.filter(n => n.id !== oldRec.id));
      } else {
        setNotifications((prev) => {
          const exists = prev.some(n => n.id === newRec.id);
          if (exists) {
            return prev.map(n => n.id === newRec.id ? newRec : n);
          } else {
            return [newRec, ...prev];
          }
        });
      }
    });
  };

  const selectOrganization = async (org, allOrgs = organizations, activeUser = user) => {
    if (!org) return;

    const fetchUserObj = activeUser || user;

    setCurrentOrganization(org);
    if (fetchUserObj) {
      localStorage.setItem(`elevate_current_org_${fetchUserObj.id}`, org.id);
    }

    setIsSwitchingWorkspace(true);

    // Clear local collections immediately before reloading to prevent data flashing
    setLeads([]);
    setDeals([]);
    setTasks([]);
    setAppointments([]);
    setCampaigns([]);
    setCampaignRecipients([]);
    setCampaignEvents([]);
    setFollowupSequences([]);
    setFollowupSteps([]);
    setFollowupExecutions([]);
    setProposals([]);
    setContracts([]);
    setForecasts([]);
    setNotifications([]);
    setOrganizationMembers([]);
    setOrganizationInvitations([]);

    setLoadingLeads(true);
    setLoadingDeals(true);
    setLoadingTasks(true);
    setLoadingCampaigns(true);
    setLoadingFollowups(true);
    setLoadingAppointments(true);
    setLoadingProposals(true);
    setLoadingContracts(true);
    setLoadingForecasts(true);

    try {
      // Fetch fresh organization data and setup subscriptions
      await fetchOrgData(org.id, fetchUserObj);
      subscribeToOrganization(org.id);
    } catch (err) {
      console.error("[Workspace] Error reloading workspace:", err);
    } finally {
      setIsSwitchingWorkspace(false);
    }
  };

  const switchOrganization = async (orgId) => {
    if (!orgId) return;
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      await selectOrganization(org, organizations, user);
    } else {
      console.warn(`[Workspace] Org ${orgId} not found in state organizations, fetching...`);
      const { data: orgRow } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .maybeSingle();
      if (orgRow) {
        await selectOrganization(orgRow, organizations, user);
      }
    }
  };

  const refreshOrganizations = async () => {
    if (user) {
      await fetchUserOrganizations(user.id, user);
    }
  };

  const fetchUserOrganizations = async (uid, activeUser = user) => {
    try {
      setLoadingOrg(true);
      console.log("[Workspace] fetchUserOrganizations initiated for user:", uid);

      const fetchUserObj = activeUser || user;
      let orgs = [];

      // Primary: use SECURITY DEFINER RPC which bypasses PostgREST RLS join issues
      const { data: rpcOrgs, error: rpcErr } = await supabase.rpc("get_my_organizations");
      
      if (!rpcErr && rpcOrgs) {
        console.log("[Workspace] get_my_organizations RPC succeeded, orgs:", rpcOrgs.length);
        orgs = rpcOrgs;
      } else {
        // Fallback: join query (may fail due to RLS on organizations join)
        console.warn("[Workspace] get_my_organizations RPC failed, using join fallback:", rpcErr?.message);
        const { data: memberRecords, error: memberErr } = await supabase
          .from("organization_members")
          .select("organization_id, role, organizations(*)")
          .eq("user_id", uid);
        
        console.log("[Workspace] Fallback memberRecords:", memberRecords, "Error:", memberErr);
        if (!memberErr) {
          for (const m of (memberRecords || [])) {
            if (m.organizations) {
              orgs.push(m.organizations);
            } else if (m.organization_id) {
              const { data: orgRow } = await supabase
                .from("organizations")
                .select("*")
                .eq("id", m.organization_id)
                .maybeSingle();
              if (orgRow) orgs.push(orgRow);
            }
          }
        }
      }

      console.log("[Workspace] Final organizations list:", orgs.map(o => `${o.name} (${o.id})`));
      setOrganizations(orgs);
      
      if (orgs.length > 0) {
        const cachedOrgId = localStorage.getItem(`elevate_current_org_${uid}`);
        const defaultOrg = orgs.find(o => o.id === cachedOrgId) || orgs[0];
        console.log("[Workspace] Selecting org:", defaultOrg?.name, "id:", defaultOrg?.id);
        await selectOrganization(defaultOrg, orgs, fetchUserObj);
      } else {
        console.log("[Workspace] No organizations found for user:", uid);
        setLoadingOrg(false);
      }
    } catch (err) {
      console.error("Failed to fetch user organizations:", err);
      setLoadingOrg(false);
    } finally {
      setLoadingOrg(false);
      console.log("[Workspace] fetchUserOrganizations complete.");
    }
  };



  // Auth Listener
  useEffect(() => {
    const getInitialSession = async () => {
      try {
        console.log("Supabase Auth: getSession() call initiated.");
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Supabase Auth: getSession() callback response:", session);
        if (session) {
          console.log("Supabase Auth: Session found on init, User UID:", session.user?.id);
          document.cookie = `sb-access-token=${session.access_token}; path=/; SameSite=Lax; Secure`;
          document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; SameSite=Lax; Secure`;
        } else {
          document.cookie = `sb-access-token=; path=/; SameSite=Lax; Secure; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
          document.cookie = `sb-refresh-token=; path=/; SameSite=Lax; Secure; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
        }
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await ensureProfileExists(session.user);
          await fetchPendingInvitations(session.user.email);
          await fetchUserOrganizations(session.user.id, session.user);
        } else {
          setOrganizations([]);
          setCurrentOrganization(null);
          setOrganizationMembers([]);
          setOrganizationRole("Viewer");
          setOrganizationInvitations([]);
          setPendingInvitations([]);
          setLoadingOrg(false);
        }
      } catch (err) {
        console.error("Error getting session:", err);
      } finally {
        setLoadingAuth(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("Supabase Auth: onAuthStateChange event triggered:", _event);
      console.log("Supabase Auth: onAuthStateChange session context:", session);
      if (session) {
        console.log("Supabase Auth: Session set/created successfully for user:", session.user?.email);
        document.cookie = `sb-access-token=${session.access_token}; path=/; SameSite=Lax; Secure`;
        document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; SameSite=Lax; Secure`;
      } else {
        document.cookie = `sb-access-token=; path=/; SameSite=Lax; Secure; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
        document.cookie = `sb-refresh-token=; path=/; SameSite=Lax; Secure; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await ensureProfileExists(session.user);
        await fetchPendingInvitations(session.user.email);
        // Skip org refresh if workspace creation is in-flight — createOrganization will call fetchUserOrganizations itself
        if (!isCreatingWorkspaceRef.current) {
          await fetchUserOrganizations(session.user.id, session.user);
        } else {
          console.log("[Workspace] onAuthStateChange: skipping fetchUserOrganizations — workspace creation in progress");
        }
      } else {
        setOrganizations([]);
        setCurrentOrganization(null);
        setOrganizationMembers([]);
        setOrganizationRole("Viewer");
        setOrganizationInvitations([]);
        setPendingInvitations([]);
        setLoadingOrg(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      orgChannelsRef.current.forEach(ch => {
        supabase.removeChannel(ch);
      });
    };
  }, []);

  // Global Realtime Subscription for User Invitations
  useEffect(() => {
    if (!user || !user.email) return;

    console.log(`[Subscription Manager] Subscribing to global invitations for: ${user.email}`);
    
    const globalInvitesChannel = supabase
      .channel(`global-user-invitations-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "organization_invitations" },
        (payload) => {
          console.log("[Realtime Global Invites] Event received:", payload);
          fetchPendingInvitations(user.email);
          
          if (currentOrganization?.id) {
            fetchOrgInvitations(currentOrganization.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalInvitesChannel);
    };
  }, [user, currentOrganization?.id]);

  // Phase 8: Auto-convert Leads to Deals when nurture_status becomes "Ready To Close"
  useEffect(() => {
    if (!user || !currentOrganization || loadingLeads || loadingDeals) return;

    leads.forEach(async (lead) => {
      if (lead.organization_id !== currentOrganization.id) return;
      if (lead.nurture_status === "Ready To Close" && !lead.deal_id) {
        // Prevent simultaneous duplicate creation attempts
        if (creatingDealIdsRef.current.has(lead.id)) return;

        // Double check if we already have a deal in state with this lead_id
        const existingDeal = deals.find((d) => d.lead_id === lead.id);
        if (!existingDeal) {
          creatingDealIdsRef.current.add(lead.id);
          console.log(`[Auto-Conversion useEffect] Lead '${lead.name}' nurture_status is Ready To Close. Auto-creating deal...`);
          try {
            await createDeal({
              title: `Deal for ${lead.company || lead.name}`,
              value: lead.value || 1000,
              stage: "Qualified",
              lead_id: lead.id,
              notes: "Automatically created when lead nurture status changed to Ready To Close.",
              source: lead.source || "CRM Lead",
              organization_id: lead.organization_id
            });
            console.log(`[Auto-Conversion useEffect] Successfully created deal for lead '${lead.name}'.`);
          } catch (err) {
            console.error(`[Auto-Conversion useEffect] Failed to auto-create deal for lead '${lead.name}':`, err.message || err, err.details || "", err);
            creatingDealIdsRef.current.delete(lead.id); // Clear on error so we can retry
          }
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, deals, user, currentOrganization, loadingLeads, loadingDeals]);

  // Auth Action Methods

  // Auth Action Methods
  const signInWithGoogle = async () => {
    try {
      const redirectToUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      console.log("Supabase Auth: Generating Google OAuth URL. Redirecting to:", redirectToUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectToUrl,
        }
      });
      
      console.log("Supabase Auth: signInWithOAuth result data:", data);
      if (error) throw error;
    } catch (err) {
      console.error("Google sign in failed:", err);
      alert(`Google Login failed: ${err.message}`);
    }
  };

  const signInWithGithub = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (err) {
      console.error("GitHub sign in failed:", err);
      alert(`GitHub Login failed: ${err.message}`);
    }
  };

  const logOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setCurrentView("home");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  const signUpWithEmail = async (email, password, fullName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error("Email signup failed:", err);
      throw err;
    }
  };

  const signInWithEmail = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    } catch (err) {
      console.error("Email sign in failed:", err);
      throw err;
    }
  };

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`,
      });
      if (error) throw error;
    } catch (err) {
      console.error("Password reset failed:", err);
      throw err;
    }
  };

  // --- Dynamic Mock Data: Support Tickets ---
  const [tickets, setTickets] = useState([
    { id: "T-1001", subject: "WhatsApp Business API template rejected", category: "AI & Automations", priority: "High", status: "Open", date: "2026-05-30", creator: "Admin" },
    { id: "T-1002", subject: "Lead scoring weights calculation delay", category: "Core CRM", priority: "Medium", status: "In Progress", date: "2026-05-29", creator: "Admin" },
    { id: "T-1003", subject: "Razorpay webhook configuration setup assistance", category: "Billing & Payments", priority: "Premium", status: "Resolved", date: "2026-05-28", creator: "Admin" },
  ]);

  // --- Dynamic Mock Data: Integrations ---
  const [integrations, setIntegrations] = useState([
    { id: "whatsapp", name: "WhatsApp Business", category: "Messaging", desc: "Automate high-conversion qualification scripts & follow-up messages.", connected: true, logo: "MessageSquare", lastActivity: "Qualified lead Rajesh Export 12 mins ago" },
    { id: "gmail", name: "Gmail", category: "Email", desc: "Send personalized AI-generated customer updates and track open rates.", connected: true, logo: "Mail", lastActivity: "Imported 3 leads 1 hour ago" },
    { id: "outlook", name: "Outlook", category: "Email", desc: "Sync professional calendar and emails with CRM communication thread.", connected: false, logo: "Mail", lastActivity: "Never connected" },
    { id: "wordpress", name: "WordPress Plugin", category: "CMS", desc: "Capture real-time forms directly into the AI pipeline automatically.", connected: true, logo: "Globe", lastActivity: "Form submission detected 4 hours ago" },
    { id: "forms", name: "Website Forms Webhook", category: "Developer", desc: "Connect any web form or custom landing page using clean API endpoints.", connected: true, logo: "Terminal", lastActivity: "Active webhook listener on port 443" },
    { id: "calendar", name: "Google Calendar", category: "Calendar", desc: "Allow leads to book strategy calls instantly with auto-reminders.", connected: true, logo: "Calendar", lastActivity: "Synced booking Amelia Thorne" },
    { id: "razorpay", name: "Razorpay Portal", category: "Payments", desc: "Trigger automated follow-ups or invoice creations on transaction success.", connected: false, logo: "CreditCard", lastActivity: "API Key pending validation" },
    { id: "api-keys", name: "Developer API Keys", category: "Developer", desc: "Integrate custom internal applications with the growth operating system.", connected: true, logo: "Key", lastActivity: "Auth token generated for sandbox env" },
  ]);

  // --- Dynamic Mock Data: Automation Workflows ---
  const [workflows, setWorkflows] = useState([
    { id: "w-1", name: "Instant Lead Qualifier & Booking", triggers: ["New Lead Entry", "AI Lead Scoring", "WhatsApp Message Sequence", "Google Calendar Booking"], active: true },
    { id: "w-2", name: "Bulk RFQ Quotation Pipeline", triggers: ["RFQ Email Received", "AI Quote Estimation", "Email Draft Approval Request", "CRM Stage Update"], active: true },
    { id: "w-3", name: "Gym Premium Member Reactivation", triggers: ["Trial Expiry (14 Days)", "WhatsApp Discount Offer", "Personal Trainer Callback Scheduling"], active: false },
    { id: "w-4", name: "Clinic Consultation Auto-Reminder", triggers: ["Booking Confirmed", "Pre-appointment SMS (24 Hours)", "Pre-appointment SMS (2 Hours)"], active: true },
  ]);

  // Activity logs inside the Integrations Hub & Dashboard
  const [activities, setActivities] = useState([]);

  // Billing active plan: Growth Tier
  const [billingPlan, setBillingPlan] = useState({
    name: "Growth Tier (Most Popular)",
    price: "$149 / mo",
    leadsCaptured: 1420,
    leadLimit: 5000,
    aiCreditsUsed: 890,
    aiCreditsLimit: 5000,
    billingDate: "June 25, 2026",
    status: "Active",
  });

  // Dynamic user appointments
  const [appointments, setAppointments] = useState([]);

  // Quick navigation helper that also handles scroll to top
  const navigateTo = (view, section = "overview") => {
    setCurrentView(view);
    if (view === "dashboard") {
      setDashboardSection(section);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- Lead Management Actions ---
  const logAudit = async (action, resourceType, resourceId = null, metadata = {}) => {
    if (!user || !currentOrganization) return;
    try {
      await supabase
        .from("organization_audit_logs")
        .insert([{
          organization_id: currentOrganization.id,
          user_id: user.id,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          metadata
        }]);
    } catch (err) {
      console.error("Failed to write audit log:", err);
    }
  };

  const addLead = async (newLead) => {
    if (!hasPermission(organizationRole, PERMISSIONS.CREATE_LEADS)) {
      const errMsg = "Forbidden: You do not have permission to create leads in this workspace.";
      alert(errMsg);
      throw new Error(errMsg);
    }

    const tempId = `temp-${Date.now()}`;
    const score = newLead.score !== undefined ? newLead.score : 0;
    const status = newLead.status || "New Lead";
    const source = newLead.source || "Website Form";
    const value = newLead.value !== undefined ? Number(newLead.value) : 1000;
    
    const payload = {
      name: newLead.name,
      email: newLead.email,
      phone: newLead.phone || null,
      company: newLead.company || null,
      industry: newLead.industry || demoIndustry,
      status,
      score,
      value,
      source,
      notes: newLead.notes || null,
      user_id: (user && user.id) ? user.id : null,
      organization_id: currentOrganization?.id || null,
      owner_id: newLead.owner_id || user?.id || null
    };

    const optimisticLead = {
      id: tempId,
      ...payload,
      date: new Date().toISOString().split("T")[0],
    };

    // 1. Optimistic Update
    setLeads((prev) => [optimisticLead, ...prev]);

    console.log("Optimistically added lead, payload:", payload);

    try {
      const { data, error } = await supabase
        .from("leads")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      const realLead = {
        ...data,
        date: data.created_at ? data.created_at.split("T")[0] : new Date().toISOString().split("T")[0],
      };

      // 2. Replace temp id lead with database record
      setLeads((prev) => prev.map((l) => (l.id === tempId ? realLead : l)));
      
      logActivity(
        source === "WhatsApp" ? "whatsapp" : source === "Gmail" ? "gmail" : "forms",
        `New ${source} submission from ${newLead.name}`
      );

      logAudit("Lead Created", "leads", data.id, { name: data.name });

      // Trigger background AI qualification asynchronously
      (async () => {
        try {
          const res = await fetch("/api/qualify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ leadId: data.id }),
          });
          if (res.ok) {
            const result = await res.json();
            if (result.success) {
              setLeads((prev) =>
                prev.map((l) =>
                  l.id === data.id
                    ? {
                        ...l,
                        score: result.score,
                        notes: result.notes,
                        ai_score: result.score,
                        ai_summary: result.notes.includes("[AI Reason]:") ? result.notes.match(/\[AI Reason\]:\s*([\s\S]*?)(?=\n\[Next Action\]:|\n----------------------------------------|$)/)?.[1]?.trim() : "",
                        recommended_action: result.notes.includes("[Next Action]:") ? result.notes.match(/\[Next Action\]:\s*([\s\S]*?)(?=\n----------------------------------------|\n\[AI Reason\]:|$)/)?.[1]?.trim() : "",
                      }
                    : l
                )
              );
            }
          }
        } catch (qualifyErr) {
          console.error("Failed to run background AI qualification:", qualifyErr);
        }
      })();

      return realLead;
    } catch (err) {
      console.error("Failed to add lead to Supabase, rolling back state:", err);
      // Rollback optimistic state
      setLeads((prev) => prev.filter((l) => l.id !== tempId));
      alert(`Failed to save lead: ${err.message || err}`);
      throw err;
    }
  };

  const updateLeadStatus = async (leadId, newStatus) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    if (!canAccessResource(organizationRole, user?.id, lead, PERMISSIONS.EDIT_LEADS)) {
      const errMsg = "Forbidden: You do not have permission to update lead status.";
      alert(errMsg);
      throw new Error(errMsg);
    }

    const originalStatus = lead.status;
    const nowStr = new Date().toISOString();

    // 1. Optimistic Update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus, last_activity_at: nowStr } : l))
    );

    try {
      const { error } = await supabase
        .from("leads")
        .update({ status: newStatus, last_activity_at: nowStr })
        .eq("id", leadId)
        .eq("organization_id", currentOrganization?.id);

      if (error) throw error;

      logActivity("system", `Lead '${lead.name}' status updated to '${newStatus}'`, leadId);

      // Recalculate priority
      await calculateAndStoreLeadPriority(leadId);

      // Auto create deal when lead becomes Ready To Close
      if (newStatus === "Ready To Close") {
        const optimisticDealPayload = {
          title: `Deal for ${lead.company || lead.name}`,
          value: lead.value || 1000,
          stage: "Qualified",
          lead_id: leadId,
          notes: "Automatically created when lead status changed to Ready To Close."
        };
        const existingDeal = deals.find(d => d.lead_id === leadId);
        if (!existingDeal) {
          console.log(`[Auto-Conversion updateLeadStatus] Lead '${lead.name}' status updated to Ready To Close. Auto-creating deal...`);
          try {
            await createDeal(optimisticDealPayload);
          } catch (createDealErr) {
            console.error("[Auto-Conversion updateLeadStatus] failed to auto-create deal:", createDealErr);
          }
        }
      }

      // Bidirectional sync: Lead Closed Won/Lost -> Deal Won/Lost
      if (newStatus === "Closed Won" || newStatus === "Closed Lost") {
        logAudit(newStatus === "Closed Won" ? "Lead Closed Won" : "Lead Closed Lost", "leads", leadId);
        const associatedDeal = deals.find(d => d.lead_id === leadId || d.id === lead.deal_id);
        if (associatedDeal) {
          const targetStage = newStatus === "Closed Won" ? "Won" : "Lost";
          const targetStatus = newStatus === "Closed Won" ? "won" : "lost";
          if (associatedDeal.stage !== targetStage || associatedDeal.status !== targetStatus) {
            await supabase
              .from("deals")
              .update({ stage: targetStage, status: targetStatus })
              .eq("id", associatedDeal.id)
              .eq("organization_id", currentOrganization?.id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to update lead status in Supabase, rolling back:", err);
      // Rollback
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: originalStatus } : l))
      );
      alert(`Failed to update CRM stage: ${err.message || err}`);
    }
  };

  const updateLead = async (leadId, updatedFields) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    if (!canAccessResource(organizationRole, user?.id, lead, PERMISSIONS.EDIT_LEADS)) {
      const errMsg = "Forbidden: You do not have permission to update this lead.";
      alert(errMsg);
      throw new Error(errMsg);
    }

    const originalFields = {};
    Object.keys(updatedFields).forEach((key) => {
      originalFields[key] = lead[key];
    });

    const nowStr = new Date().toISOString();
    const fieldsToUpdate = {
      ...updatedFields,
      last_activity_at: nowStr
    };

    // 1. Optimistic Update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, ...fieldsToUpdate } : l))
    );

    try {
      const { error } = await supabase
        .from("leads")
        .update(fieldsToUpdate)
        .eq("id", leadId)
        .eq("organization_id", currentOrganization?.id);

      if (error) throw error;

      logActivity("system", `Lead '${lead.name}' details updated`, leadId);

      // Recalculate priority
      await calculateAndStoreLeadPriority(leadId);

      // Auto create deal when lead becomes Ready To Close
      if (updatedFields.status === "Ready To Close" || updatedFields.nurture_status === "Ready To Close") {
        const existingDeal = deals.find(d => d.lead_id === leadId);
        if (!existingDeal) {
          console.log(`[Auto-Conversion updateLead] Lead '${lead.name}' status/nurture updated to Ready To Close. Auto-creating deal...`);
          try {
            await createDeal({
              title: `Deal for ${lead.company || lead.name}`,
              value: lead.value || 1000,
              stage: "Qualified",
              lead_id: leadId,
              notes: "Automatically created when lead status/nurture changed to Ready To Close."
            });
          } catch (createDealErr) {
            console.error("[Auto-Conversion updateLead] failed to auto-create deal:", createDealErr);
          }
        }
      }

      // Bidirectional sync: Lead Closed Won/Lost -> Deal Won/Lost
      if (updatedFields.status === "Closed Won" || updatedFields.status === "Closed Lost") {
        logAudit(updatedFields.status === "Closed Won" ? "Lead Closed Won" : "Lead Closed Lost", "leads", leadId);
        
        // Cancel all pending/scheduled follow-ups for this lead
        await supabase
          .from("followup_executions")
          .update({ status: "cancelled" })
          .eq("lead_id", leadId)
          .in("status", ["scheduled", "pending", "waiting_reply"]);

        const associatedDeal = deals.find(d => d.lead_id === leadId || d.id === lead.deal_id);
        if (associatedDeal) {
          const targetStage = updatedFields.status === "Closed Won" ? "Won" : "Lost";
          const targetStatus = updatedFields.status === "Closed Won" ? "won" : "lost";
          if (associatedDeal.stage !== targetStage || associatedDeal.status !== targetStatus) {
            await supabase
              .from("deals")
              .update({ stage: targetStage, status: targetStatus })
              .eq("id", associatedDeal.id)
              .eq("organization_id", currentOrganization?.id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to update lead details in Supabase, rolling back:", err);
      // Rollback
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, ...originalFields } : l))
      );
      alert(`Failed to save lead changes: ${err.message || err}`);
      throw err;
    }
  };

  const removeLead = async (leadId) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    if (!canAccessResource(organizationRole, user?.id, lead, PERMISSIONS.DELETE_LEADS)) {
      const errMsg = "Forbidden: You do not have permission to delete this lead.";
      alert(errMsg);
      throw new Error(errMsg);
    }

    // 1. Optimistic Update
    setLeads((prev) => prev.filter((l) => l.id !== leadId));

    try {
      const { error } = await supabase
        .from("leads")
        .update({ deleted_at: new Date().toISOString() }) // Soft delete!
        .eq("id", leadId)
        .eq("organization_id", currentOrganization?.id);

      if (error) throw error;

      logActivity("system", `Lead '${lead.name}' removed`);
      logAudit("Lead Deleted", "leads", leadId, { name: lead.name });
    } catch (err) {
      console.error("Failed to remove lead from Supabase, rolling back:", err);
      // Rollback
      setLeads((prev) => [lead, ...prev]);
      alert(`Failed to delete lead: ${err.message || err}`);
    }
  };

  // --- Support Ticket Actions ---
  const createTicket = (ticketData) => {
    const newTicket = {
      id: `T-${Math.floor(Math.random() * 9000) + 1000}-${Date.now()}`,
      status: "Open",
      date: new Date().toISOString().split("T")[0],
      creator: "Growth User",
      ...ticketData
    };
    setTickets((prev) => [newTicket, ...prev]);
    logActivity("system", `Support Ticket '${newTicket.id}' created: ${newTicket.subject}`);
  };

  const updateTicketStatus = (ticketId, newStatus) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
    );
  };

  // --- Integration Connections Toggles ---
  const toggleIntegration = (id) => {
    setIntegrations((prev) =>
      prev.map((integ) => {
        if (integ.id === id) {
          const nextState = !integ.connected;
          logActivity(
            id,
            `${integ.name} integration has been ${nextState ? "connected" : "disconnected"} successfully`
          );
          return {
            ...integ,
            connected: nextState,
            lastActivity: nextState ? "Just established connection" : "Connection terminated"
          };
        }
        return integ;
      })
    );
  };

  // --- Automation Toggle Actions ---
  const toggleWorkflow = (workflowId) => {
    setWorkflows((prev) =>
      prev.map((w) => (w.id === workflowId ? { ...w, active: !w.active } : w))
    );
  };

  // --- Helper to Log Integration Activity Log ---
  const logActivity = async (type, message, leadId = null) => {
    const tempId = `log-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const newLog = {
      id: tempId,
      type,
      message,
      time: "Just now",
      created_at: new Date().toISOString()
    };
    
    setActivities((prev) => {
      const nonMock = prev.filter(a => typeof a.id === 'string' && !String(a.id).startsWith('log-'));
      return [newLog, ...nonMock.slice(0, 19)];
    });

    if (user) {
      try {
        const orgId = currentOrganization?.id || (leadId ? leads.find(l => l.id === leadId)?.organization_id : null);
        if (!orgId) {
          console.warn("[Workspace] logActivity skipped: No active organization available to scope the activity.");
          return;
        }

        const { data, error } = await supabase
          .from("activities")
          .insert([{
            user_id: user.id,
            lead_id: leadId,
            type,
            message,
            content: {},
            organization_id: orgId
          }])
          .select()
          .single();

        if (error) throw error;
        setActivities((prev) => prev.map((a) => (a.id === tempId ? data : a)));
      } catch (err) {
        console.error("Failed to save activity log in Supabase:", err.message, err.details, err);
      }
    }
  };

  // --- Book a Strategy Session Calendar ---
  const bookAppointment = async (appointmentData) => {
    if (!hasPermission(organizationRole, PERMISSIONS.BOOK_MEETINGS)) {
      const errMsg = "Forbidden: You do not have permission to book appointments in this workspace.";
      alert(errMsg);
      throw new Error(errMsg);
    }

    const newApt = {
      id: `apt-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      status: "Confirmed",
      ...appointmentData,
    };
    setAppointments((prev) => [newApt, ...prev]);
    
    // Auto-create a lead for them if they booked a call from the website!
    try {
      await addLead({
        name: appointmentData.clientName,
        email: appointmentData.email || "consult@expert.com",
        phone: appointmentData.phone || "+91 63743 85901",
        industry: demoIndustry,
        value: 1500,
        source: "Google Calendar",
        notes: `Pre-booked strategy call for: ${appointmentData.type}`,
      });
    } catch (err) {
      console.error("Failed to auto-create lead during booking:", err);
    }

    logActivity("calendar", `Booked appointment for ${appointmentData.clientName}`);
  };

  const bookGoogleMeeting = async (meetingData) => {
    if (!hasPermission(organizationRole, PERMISSIONS.BOOK_MEETINGS)) {
      const errMsg = "Forbidden: You do not have permission to book meetings in this workspace.";
      alert(errMsg);
      throw new Error(errMsg);
    }

    const { leadId, title, startTime, endTime, description } = meetingData;
    if (!user) {
      alert("You must be logged in to book a meeting.");
      return;
    }
    
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) {
      alert("Lead not found.");
      return;
    }
    
    const originalStatus = lead.status;
    const tempAptId = `temp-apt-${Date.now()}`;
    
    // Create optimistic appointment
    const tempApt = {
      id: tempAptId,
      user_id: user.id,
      lead_id: leadId,
      event_id: null,
      meet_link: "https://meet.google.com/abc-defg-hij", // temporary placeholder
      title,
      description: description || "Strategy consultation session.",
      start_time: startTime,
      end_time: endTime,
      status: "upcoming",
      clientName: title,
      type: description || "Strategy consultation session.",
      date: startTime.split("T")[0],
      time: new Date(startTime).toLocaleTimeString("default", { hour: "numeric", minute: "2-digit" }),
    };
    
    // Optimistic updates
    setAppointments((prev) => [...prev, tempApt].sort((a, b) => new Date(a.start_time) - new Date(b.start_time)));
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: "Appointment Booked" } : l))
    );
    
    try {
      const response = await fetch("/api/google/create-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId,
          userId: user.id,
          title,
          startTime,
          endTime,
          description,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to book meeting");
      }
      
      const realApt = result.appointment;
      const formattedRealApt = {
        ...realApt,
        clientName: realApt.title,
        type: realApt.description,
        date: realApt.start_time ? realApt.start_time.split("T")[0] : "",
        time: realApt.start_time ? new Date(realApt.start_time).toLocaleTimeString("default", { hour: "numeric", minute: "2-digit" }) : "",
      };
      
      // Replace optimistic appointment with real one
      setAppointments((prev) =>
        prev.map((a) => (a.id === tempAptId ? formattedRealApt : a)).sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
      );
      
      logActivity("calendar", `Booked Google Meeting: ${title}`);
      return result;
    } catch (err) {
      console.error("Booking meeting failed, rolling back:", err);
      
      // Rollback optimistic state
      setAppointments((prev) => prev.filter((a) => a.id !== tempAptId));
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: originalStatus } : l))
      );
      
      alert(`Meeting booking failed: ${err.message}`);
      throw err;
    }
  };

  const cancelGoogleMeeting = async (appointmentId) => {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return;
    
    if (!canAccessResource(organizationRole, user?.id, apt, PERMISSIONS.BOOK_MEETINGS)) {
      const errMsg = "Forbidden: You do not have permission to cancel this meeting.";
      alert(errMsg);
      throw new Error(errMsg);
    }
    
    const originalStatus = apt.status;
    
    // Optimistic Update
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status: "cancelled" } : a))
    );
    
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentId)
        .eq("organization_id", currentOrganization?.id);
      
      if (error) throw error;
      
      logActivity("calendar", `Cancelled appointment with ${apt.clientName || apt.title}`, apt.lead_id);

      // Recalculate priority
      if (apt.lead_id) {
        await calculateAndStoreLeadPriority(apt.lead_id);
      }
    } catch (err) {
      console.error("Failed to cancel appointment in Supabase, rolling back:", err);
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: originalStatus } : a))
      );
      alert(`Failed to cancel appointment: ${err.message || err}`);
    }
  };

  const disconnectGoogleCalendar = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ google_connected: false, google_refresh_token: null })
        .eq("id", user.id);
      if (error) throw error;
      setGoogleConnected(false);
      logActivity("calendar", "Google Calendar disconnected");
    } catch (err) {
      console.error("Failed to disconnect Google Calendar:", err);
      alert(`Failed to disconnect: ${err.message}`);
    }
  };

  const toggleTaskCompletion = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === "completed" ? "pending" : "completed";
    
    // Optimistic Update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
    );

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: nextStatus })
        .eq("id", taskId)
        .eq("organization_id", currentOrganization?.id);
      if (error) throw error;
      
      const task = tasks.find(t => t.id === taskId);
      logActivity("system", `Task '${task?.title || "Sales Action"}' marked as ${nextStatus}`, task?.lead_id);
    } catch (err) {
      console.error("Failed to update task status:", err);
      // Rollback
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: currentStatus } : t))
      );
      alert("Failed to update task: " + err.message);
    }
  };

  const generateFollowup = async (leadId) => {
    try {
      const res = await fetch("/api/generate-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate follow-up");
      return data;
    } catch (err) {
      console.error("Error generating follow-up:", err);
      throw err;
    }
  };

  const generateDailyTasks = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/generate-daily-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, organizationId: currentOrganization?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate tasks");
      return data;
    } catch (err) {
      console.error("Error generating daily tasks:", err);
      throw err;
    }
  };

  // --- Campaign & Sequence Actions ---
  const generateCampaign = async (leadIds, campaignGoal) => {
    if (!hasPermission(organizationRole, PERMISSIONS.CREATE_CAMPAIGNS)) {
      const errMsg = "Forbidden: You do not have permission to generate campaigns.";
      alert(errMsg);
      throw new Error(errMsg);
    }

    try {
      const res = await fetch("/api/generate-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds, campaignGoal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate campaign emails");
      return data;
    } catch (err) {
      console.error("Error generating campaign emails:", err);
      throw err;
    }
  };

  const createCampaign = async (name, subject, body, leadIds) => {
    if (!hasPermission(organizationRole, PERMISSIONS.CREATE_CAMPAIGNS)) {
      const errMsg = "Forbidden: You do not have permission to create campaigns.";
      alert(errMsg);
      throw new Error(errMsg);
    }

    if (!user) throw new Error("User must be logged in to create a campaign");
    try {
      // 1. Insert Campaign
      const { data: campaign, error: campError } = await supabase
        .from("campaigns")
        .insert([{
          name,
          channel: "email",
          status: "draft",
          subject,
          body,
          total_leads: leadIds.length,
          sent_count: 0,
          open_count: 0,
          reply_count: 0,
          click_count: 0,
          bounce_count: 0,
          appointment_count: 0,
          user_id: user.id,
          created_by: user.id,
          organization_id: currentOrganization?.id || null
        }])
        .select()
        .single();

      if (campError) throw campError;

      // 2. Fetch leads to get their email addresses
      const { data: leadEmails, error: emailsError } = await supabase
        .from("leads")
        .select("id, email")
        .in("id", leadIds);
      
      if (emailsError) throw emailsError;

      const emailsMap = new Map((leadEmails || []).map(l => [l.id, l.email]));

      // 3. Insert Recipients
      const recipientInserts = leadIds.map(leadId => ({
        campaign_id: campaign.id,
        lead_id: leadId,
        email: emailsMap.get(leadId) || null,
        status: "pending",
        subject: null,
        body: null,
        organization_id: currentOrganization?.id || null
      }));

      const { error: recError } = await supabase
        .from("campaign_recipients")
        .insert(recipientInserts);

      if (recError) throw recError;

      await logActivity("system", `Created outreach campaign '${name}' for ${leadIds.length} prospects`);
      return campaign.id;
    } catch (err) {
      console.error("Failed to create campaign:", err);
      alert("Failed to save campaign in CRM: " + err.message);
      throw err;
    }
  };

  const updateCampaign = async (campaignId, updates) => {
    if (!currentOrganization) return null;
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .update(updates)
        .eq("id", campaignId)
        .eq("organization_id", currentOrganization.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error("Failed to update campaign:", err);
      alert("Failed to update campaign: " + err.message);
      throw err;
    }
  };

  const deleteCampaign = async (campaignId) => {
    if (!currentOrganization) return;
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", campaignId)
        .eq("organization_id", currentOrganization.id);
      
      if (error) throw error;
      await logActivity("system", `Deleted campaign`);
    } catch (err) {
      console.error("Failed to delete campaign:", err);
      alert("Failed to delete campaign: " + err.message);
      throw err;
    }
  };

  const sendCampaign = async (campaignId) => {
    if (!hasPermission(organizationRole, PERMISSIONS.SEND_CAMPAIGNS)) {
      const errMsg = "Forbidden: You do not have permission to send campaigns.";
      alert(errMsg);
      throw new Error(errMsg);
    }

    try {
      const res = await fetch("/api/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send campaign");
      return data;
    } catch (err) {
      console.error("Error sending campaign:", err);
      throw err;
    }
  };

  const generateCampaignEmail = async (goal, audience, offer, tone) => {
    if (!hasPermission(organizationRole, PERMISSIONS.CREATE_CAMPAIGNS)) {
      const errMsg = "Forbidden: You do not have permission to generate campaigns.";
      alert(errMsg);
      throw new Error(errMsg);
    }
    if (!currentOrganization) throw new Error("No active organization");

    try {
      const res = await fetch("/api/campaigns/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, audience, offer, tone, organizationId: currentOrganization.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate template copy");
      return data;
    } catch (err) {
      console.error("Error generating campaign template copy:", err);
      throw err;
    }
  };

  const getCampaignAnalytics = () => {
    const activeCampaigns = campaigns.filter(c => !c.deleted_at);
    const totalSent = activeCampaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
    const totalOpened = activeCampaigns.reduce((acc, c) => acc + (c.open_count || 0), 0);
    const totalClicked = activeCampaigns.reduce((acc, c) => acc + (c.click_count || 0), 0);
    const totalBounced = activeCampaigns.reduce((acc, c) => acc + (c.bounce_count || 0), 0);
    const totalReplied = activeCampaigns.reduce((acc, c) => acc + (c.reply_count || 0), 0);

    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const clickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
    const replyRate = totalSent > 0 ? (totalReplied / totalSent) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;

    const wonDeals = deals.filter(d => d.stage === "Won" || d.status === "won");
    const leadIdsInCampaigns = new Set(campaignRecipients.map(r => r.lead_id));
    const revenueGenerated = wonDeals
      .filter(d => leadIdsInCampaigns.has(d.lead_id))
      .reduce((acc, d) => acc + (d.value || 0), 0);

    return {
      totalSent,
      totalOpened,
      totalClicked,
      totalBounced,
      totalReplied,
      openRate,
      clickRate,
      replyRate,
      bounceRate,
      revenueGenerated
    };
  };

  const generateSequence = async (name, goal) => {
    if (!hasPermission(organizationRole, PERMISSIONS.CREATE_CAMPAIGNS)) {
      const errMsg = "Forbidden: You do not have permission to generate sequences.";
      alert(errMsg);
      throw new Error(errMsg);
    }

    try {
      const res = await fetch("/api/generate-sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, goal, organizationId: currentOrganization?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate sequence");
      return data;
    } catch (err) {
      console.error("Error generating outreach sequence:", err);
      throw err;
    }
  };

  const toggleSequenceActive = async (sequenceId, currentActive) => {
    if (!hasPermission(organizationRole, PERMISSIONS.SEND_CAMPAIGNS)) {
      const errMsg = "Forbidden: You do not have permission to toggle sequences.";
      alert(errMsg);
      return;
    }

    const nextActive = !currentActive;
    try {
      const { error } = await supabase
        .from("outreach_sequences")
        .update({ active: nextActive })
        .eq("id", sequenceId)
        .eq("organization_id", currentOrganization?.id);

      if (error) throw error;
      setSequences(prev => prev.map(s => s.id === sequenceId ? { ...s, active: nextActive } : s));
      await logActivity("system", `Outreach sequence ${nextActive ? "activated" : "deactivated"}`);
    } catch (err) {
      console.error("Failed to toggle sequence status:", err);
      alert("Failed to update sequence: " + err.message);
    }
  };

  // --- Follow-Up Engine Action Methods ---
  const createFollowupSequence = async (name, description, steps) => {
    console.log("RBAC Debug: [createFollowupSequence] initiated", {
      organizationRole,
      permissionKey: PERMISSIONS.CREATE_FOLLOWUPS,
      hasPermissionResult: hasPermission(organizationRole, PERMISSIONS.CREATE_FOLLOWUPS)
    });
    if (!hasPermission(organizationRole, PERMISSIONS.CREATE_FOLLOWUPS)) {
      const errMsg = "Forbidden: You do not have permission to create follow-up sequences.";
      alert(errMsg);
      throw new Error(errMsg);
    }
    if (!currentOrganization) throw new Error("No active organization");
    
    try {
      const { data: sequence, error: seqErr } = await supabase
        .from("followup_sequences")
        .insert([{
          name,
          description,
          organization_id: currentOrganization.id,
          created_by: user.id
        }])
        .select()
        .single();
      
      if (seqErr) throw seqErr;

      const stepInserts = steps.map((s, index) => ({
        sequence_id: sequence.id,
        step_number: index + 1,
        delay_days: Number(s.delay_days) || 0,
        step_type: s.step_type || 'followup',
        subject_template: s.subject_template || '',
        body_template: s.body_template || ''
      }));

      if (stepInserts.length > 0) {
        const { error: stepsErr } = await supabase
          .from("followup_steps")
          .insert(stepInserts);
        if (stepsErr) throw stepsErr;
      }

      await logActivity("system", `Created follow-up sequence '${name}'`);
      await supabase
        .from("organization_audit_logs")
        .insert([{
          organization_id: currentOrganization.id,
          user_id: user.id,
          action: "Sequence Created",
          resource_type: "followup_sequences",
          resource_id: sequence.id,
          metadata: { name, step_count: steps.length }
        }]);

      return sequence;
    } catch (err) {
      console.error("Failed to create follow-up sequence:", err);
      alert("Failed to create sequence: " + err.message);
      throw err;
    }
  };

  const updateFollowupSequence = async (sequenceId, updates) => {
    if (!hasPermission(organizationRole, PERMISSIONS.CREATE_FOLLOWUPS)) {
      const errMsg = "Forbidden: You do not have permission to edit follow-up sequences.";
      alert(errMsg);
      throw new Error(errMsg);
    }
    if (!currentOrganization) throw new Error("No active organization");

    try {
      const { data, error } = await supabase
        .from("followup_sequences")
        .update(updates)
        .eq("id", sequenceId)
        .eq("organization_id", currentOrganization.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error("Failed to update sequence:", err);
      alert("Failed to update sequence: " + err.message);
      throw err;
    }
  };

  const deleteFollowupSequence = async (sequenceId) => {
    if (!hasPermission(organizationRole, PERMISSIONS.CREATE_FOLLOWUPS)) {
      const errMsg = "Forbidden: You do not have permission to delete sequences.";
      alert(errMsg);
      throw new Error(errMsg);
    }
    if (!currentOrganization) return;
    try {
      const { error } = await supabase
        .from("followup_sequences")
        .delete()
        .eq("id", sequenceId)
        .eq("organization_id", currentOrganization.id);
      
      if (error) throw error;
      await logActivity("system", `Deleted follow-up sequence`);
    } catch (err) {
      console.error("Failed to delete sequence:", err);
      alert("Failed to delete sequence: " + err.message);
      throw err;
    }
  };

  const scheduleFollowup = async (leadId, sequenceId) => {
    if (!hasPermission(organizationRole, PERMISSIONS.CREATE_FOLLOWUPS)) {
      const errMsg = "Forbidden: You do not have permission to schedule follow-ups.";
      alert(errMsg);
      throw new Error(errMsg);
    }
    if (!currentOrganization) throw new Error("No active organization");

    try {
      const { data: steps, error: stepsErr } = await supabase
        .from("followup_steps")
        .select("*")
        .eq("sequence_id", sequenceId)
        .order("step_number", { ascending: true });

      if (stepsErr) throw stepsErr;
      if (!steps || steps.length === 0) {
        throw new Error("Cannot schedule sequence: No steps configured.");
      }

      const firstStep = steps[0];
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + (firstStep.delay_days || 0));

      const { data: lead } = await supabase
        .from("leads")
        .select("score, nurture_status, ai_summary")
        .eq("id", leadId)
        .single();

      const contextSnapshot = {
        lead_score: lead?.score || 0,
        nurture_status: lead?.nurture_status || "New Lead",
        pain_points: lead?.ai_summary ? [lead.ai_summary] : []
      };

      const { data: execution, error: execErr } = await supabase
        .from("followup_executions")
        .insert([{
          organization_id: currentOrganization.id,
          lead_id: leadId,
          sequence_id: sequenceId,
          step_id: firstStep.id,
          status: "scheduled",
          scheduled_for: scheduledDate.toISOString(),
          context_snapshot: contextSnapshot,
          influenced_revenue: 0
        }])
        .select()
        .single();

      if (execErr) throw execErr;

      await logActivity("system", `Scheduled follow-up step 1 for lead`);
      return execution;
    } catch (err) {
      console.error("Failed to schedule follow-up:", err);
      alert("Failed to schedule follow-up: " + err.message);
      throw err;
    }
  };

  const cancelFollowup = async (executionId) => {
    if (!hasPermission(organizationRole, PERMISSIONS.CREATE_FOLLOWUPS)) {
      const errMsg = "Forbidden: You do not have permission to cancel follow-ups.";
      alert(errMsg);
      throw new Error(errMsg);
    }
    if (!currentOrganization) return;
    try {
      const { error } = await supabase
        .from("followup_executions")
        .update({ status: "cancelled" })
        .eq("id", executionId)
        .eq("organization_id", currentOrganization.id);

      if (error) throw error;
      await logActivity("system", `Cancelled follow-up step`);
      
      await supabase
        .from("organization_audit_logs")
        .insert([{
          organization_id: currentOrganization.id,
          user_id: user.id,
          action: "Sequence Cancelled",
          resource_type: "followup_executions",
          resource_id: executionId,
          metadata: { execution_id: executionId }
        }]);
    } catch (err) {
      console.error("Failed to cancel follow-up:", err);
      alert("Failed to cancel follow-up: " + err.message);
      throw err;
    }
  };

  const executeFollowup = async (executionId) => {
    if (!hasPermission(organizationRole, PERMISSIONS.EXECUTE_FOLLOWUPS)) {
      const errMsg = "Forbidden: You do not have permission to execute follow-ups.";
      alert(errMsg);
      throw new Error(errMsg);
    }
    try {
      const res = await fetch("/api/followups/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ executionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to execute follow-up");
      return data;
    } catch (err) {
      console.error("Error executing follow-up:", err);
      alert("Execution failed: " + err.message);
      throw err;
    }
  };

  // --- Revenue Intelligence Action Methods ---
  const createDeal = async (dealData) => {
    if (!hasPermission(organizationRole, PERMISSIONS.CREATE_DEALS)) {
      const errMsg = "Forbidden: You do not have permission to create deals in this workspace.";
      alert(errMsg);
      throw new Error(errMsg);
    }

    const orgId = dealData.organization_id || currentOrganization?.id;
    if (!user || !orgId) throw new Error("A workspace organization session is required to create a deal");
    try {
      const payload = {
        title: dealData.title,
        value: dealData.value ? Number(dealData.value) : 0,
        stage: dealData.stage || "Qualified",
        close_probability: dealData.close_probability || 50,
        risk_level: dealData.risk_level || "Medium",
        expected_close_date: dealData.expected_close_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: dealData.status || "open",
        notes: dealData.notes || "",
        lead_id: dealData.lead_id,
        source: dealData.source || "CRM Lead",
        owner_id: dealData.owner_id || user?.id,
        user_id: user?.id,
        organization_id: orgId
      };

      console.log("[createDeal] Attempting to insert deal with payload:", payload);
      const { data, error } = await supabase
        .from("deals")
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error("[createDeal] Error inserting deal record:", error.message, error.details, error);
        throw error;
      }
      console.log("[createDeal] Deal record created successfully:", data);

      // Update the lead table to store the deal relationship
      if (dealData.lead_id) {
        console.log(`[createDeal] Updating lead ${dealData.lead_id} with deal_id ${data.id}`);
        const { error: leadUpdateError } = await supabase
          .from("leads")
          .update({ deal_id: data.id })
          .eq("id", dealData.lead_id)
          .eq("organization_id", orgId);
        if (leadUpdateError) {
          console.error("[createDeal] Error updating lead deal_id:", leadUpdateError);
        } else {
          console.log("[createDeal] Lead deal_id successfully linked.");
        }
      }

      logActivity("system", `Created deal '${data.title}' at stage '${data.stage}'`, dealData.lead_id);
      logAudit("Deal Created", "deals", data.id, { title: data.title, value: data.value });

      // Update forecast
      console.log("[createDeal] Recalculating forecasts for user ID / Org ID:", user?.id, orgId);
      updateDealForecasts(user?.id, orgId).catch(console.error);

      return data;
    } catch (err) {
      console.error("Failed to create deal:", err.message, err.details, err);
      throw err;
    }
  };

  const updateDeal = async (dealId, updatedFields) => {
    if (!currentOrganization) return null;

    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return null;

    if (!canAccessResource(organizationRole, user?.id, deal, PERMISSIONS.EDIT_DEALS)) {
      const errMsg = "Forbidden: You do not have permission to update this deal.";
      alert(errMsg);
      throw new Error(errMsg);
    }

    try {
      const { data, error } = await supabase
        .from("deals")
        .update(updatedFields)
        .eq("id", dealId)
        .eq("organization_id", currentOrganization.id)
        .select()
        .single();

      if (error) throw error;

      logActivity("system", `Updated deal '${data.title}'`, data.lead_id);

      if (updatedFields.stage === "Won" || updatedFields.status === "won") {
        logAudit("Deal Won", "deals", dealId, { title: data.title, value: data.value });
      }

      // Enable Lead <-> Deal synchronization
      // Deal Won -> Lead Closed Won
      // Deal Lost -> Lead Closed Lost
      if (data.lead_id) {
        if (updatedFields.stage === "Won" || updatedFields.status === "won") {
          await supabase
            .from("leads")
            .update({ status: "Closed Won" })
            .eq("id", data.lead_id)
            .eq("organization_id", currentOrganization.id);

          await supabase
            .from("followup_executions")
            .update({ status: "cancelled" })
            .eq("lead_id", data.lead_id)
            .in("status", ["scheduled", "pending", "waiting_reply"]);
        } else if (updatedFields.stage === "Lost" || updatedFields.status === "lost") {
          await supabase
            .from("leads")
            .update({ status: "Closed Lost" })
            .eq("id", data.lead_id)
            .eq("organization_id", currentOrganization.id);

          await supabase
            .from("followup_executions")
            .update({ status: "cancelled" })
            .eq("lead_id", data.lead_id)
            .in("status", ["scheduled", "pending", "waiting_reply"]);
        }
      }

      // Update forecast
      updateDealForecasts(user?.id, currentOrganization.id).catch(console.error);

      return data;
    } catch (err) {
      console.error("Failed to update deal:", err);
      throw err;
    }
  };

  const generateProposal = async (dealId) => {
    if (!hasPermission(organizationRole, PERMISSIONS.GENERATE_PROPOSALS)) {
      const errMsg = "Forbidden: You do not have permission to generate proposals.";
      alert(errMsg);
      throw new Error(errMsg);
    }

    try {
      const res = await fetch("/api/deals/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate proposal");
      
      logActivity("system", "AI Proposal generated", data.proposal?.deal_id);
      logAudit("Proposal Sent", "proposals", data.proposal?.id, { title: data.proposal?.proposal_title });
      return data.proposal;
    } catch (err) {
      console.error("Error generating proposal:", err);
      throw err;
    }
  };

  const generateContract = async (dealId) => {
    if (!hasPermission(organizationRole, PERMISSIONS.GENERATE_CONTRACTS)) {
      const errMsg = "Forbidden: You do not have permission to generate contracts.";
      alert(errMsg);
      throw new Error(errMsg);
    }

    try {
      const res = await fetch("/api/deals/contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate contract");
      
      logActivity("system", "AI Contract generated", data.contract?.deal_id);
      logAudit("Contract Drafted", "contracts", data.contract?.id);
      return data.contract;
    } catch (err) {
      console.error("Error generating contract:", err);
      throw err;
    }
  };

  // --- Workspace Onboarding & Member Management Actions ---
  const createOrganization = async (name, industry, teamSize, initialLeads = [], logoUrl = null, primaryColor = '#C5A028') => {
    if (!user) {
      console.warn("[Workspace] User is not defined in createOrganization");
      return null;
    }
    isCreatingWorkspaceRef.current = true;
    const payload = {
      p_name: name,
      p_slug: `org-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")}-${Math.random().toString(36).substring(2, 8)}`,
      p_industry: industry,
      p_logo_url: logoUrl,
      p_primary_color: primaryColor
    };
    
    console.log("[Workspace] RPC payload", payload);
    try {
      // 1. Call SECURITY DEFINER RPC function to create workspace & owner membership in a single transaction
      const { data, error: rpcErr } = await supabase.rpc("create_organization_workspace", payload);
      
      console.log("[Workspace] RPC result raw", { data, rpcErr });
      if (rpcErr) {
        console.error("[Workspace] RPC error", rpcErr);
        isCreatingWorkspaceRef.current = false;
        throw rpcErr;
      }

      // Normalize RPC response: handle both old UUID string return and new JSONB object return
      let orgId, orgName;
      if (data && typeof data === "object" && data.organization_id) {
        // New JSONB return: { organization_id, organization_name, role }
        orgId = data.organization_id;
        orgName = data.organization_name;
        console.log("[Workspace] RPC returned JSONB. organization_id:", orgId);
      } else if (data && typeof data === "string") {
        // Old UUID return: the data IS the org ID
        orgId = data;
        orgName = name;
        console.log("[Workspace] RPC returned UUID (old DB schema). organization_id:", orgId);
      } else {
        console.error("[Workspace] RPC returned unexpected structure:", data);
        isCreatingWorkspaceRef.current = false;
        throw new Error("create_organization_workspace returned an unexpected structure. Please run the updated phase9.sql function in your Supabase SQL Editor.");
      }

      // Verify organization and membership exists
      console.log("[Workspace] Verifying organization row exists...");
      const { data: verifyOrg, error: verifyOrgErr } = await supabase
        .from("organizations")
        .select()
        .eq("id", orgId)
        .single();
      console.log("[Workspace] Verification check - Organization row:", verifyOrg, "Error:", verifyOrgErr);

      console.log("[Workspace] Verifying membership row exists...");
      const { data: verifyMem, error: verifyMemErr } = await supabase
        .from("organization_members")
        .select()
        .eq("organization_id", orgId)
        .eq("user_id", user.id)
        .single();
      console.log("[Workspace] Verification check - Membership row:", verifyMem, "Error:", verifyMemErr);

      // 2. Log Audit Log (fire-and-forget — do not block workspace creation on this)
      supabase
        .from("organization_audit_logs")
        .insert([{
          organization_id: orgId,
          user_id: user.id,
          action: "Workspace Created",
          resource_type: "organizations",
          resource_id: orgId,
          metadata: { name, industry, teamSize }
        }]).then(({ error }) => {
          if (error) console.warn("[Workspace] Audit log insert failed (non-blocking):", error);
        });

      // 3. Create initial leads if any
      if (initialLeads.length > 0) {
        const leadInserts = initialLeads.map(l => ({
          name: l.name,
          email: l.email || `${l.name.toLowerCase().replace(/ /g, "")}@example.com`,
          phone: l.phone || null,
          company: l.company || null,
          industry: industry,
          status: "New Lead",
          score: 50,
          value: 1500,
          source: "Wizard Import",
          user_id: user.id,
          organization_id: orgId,
          owner_id: user.id
        }));
        await supabase.from("leads").insert(leadInserts);
      }

      // Store in localStorage so fetchUserOrganizations selects the new org
      localStorage.setItem(`elevate_current_org_${user.id}`, orgId);
      console.log("[Workspace] LocalStorage org set to:", localStorage.getItem(`elevate_current_org_${user.id}`));

      // Refresh organizations list — this will call selectOrganization internally
      console.log("[Workspace] Refreshing organizations list...");
      await fetchUserOrganizations(user.id);

      // Release lock AFTER refresh is complete
      console.log("[Workspace] Refresh complete. Releasing workspace creation lock.");
      isCreatingWorkspaceRef.current = false;

      return { id: orgId, name: orgName };
    } catch (err) {
      isCreatingWorkspaceRef.current = false;
      console.error("Failed to create workspace organization:", err);
      alert("Failed to create workspace: " + err.message);
      throw err;
    }
  };


  const inviteMember = async (email, role) => {
    if (!user || !currentOrganization) {
      alert("No active organization selected.");
      return null;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      alert("Please provide a valid email address.");
      throw new Error("Invalid email address");
    }

    const allowedRoles = ["Owner", "Admin", "Manager", "Sales Rep", "Viewer"];
    if (!role || !allowedRoles.includes(role)) {
      alert("Please select a valid role.");
      throw new Error("Invalid role selection");
    }

    // Only Owners, Admins and Managers can invite (based on updated rbac mapping)
    if (organizationRole !== "Owner" && organizationRole !== "Admin" && organizationRole !== "Manager") {
      alert("Only organization Owners, Admins, and Managers may invite members.");
      throw new Error("Insufficient permissions to invite members");
    }

    try {
      const { data: existingPending, error: checkError } = await supabase
        .from("organization_invitations")
        .select("id")
        .eq("organization_id", currentOrganization.id)
        .eq("email", email.trim())
        .eq("status", "pending")
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingPending) {
        alert("A pending invitation already exists for this email address.");
        throw new Error("Duplicate pending invitation");
      }

      // Check if user is already a member
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.trim())
        .maybeSingle();

      if (targetProfile) {
        const { data: memberRecord } = await supabase
          .from("organization_members")
          .select("id")
          .eq("organization_id", currentOrganization.id)
          .eq("user_id", targetProfile.id)
          .maybeSingle();
        
        if (memberRecord) {
          alert("This user is already a member of this organization.");
          throw new Error("User is already a member");
        }
      }

      const { data, error } = await supabase
        .from("organization_invitations")
        .insert([{
          organization_id: currentOrganization.id,
          email: email.trim(),
          role,
          invited_by: user.id,
          status: "pending"
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      await logAudit("Member Invited", "organization_invitations", data.id, { email, role });
      await fetchOrgInvitations(currentOrganization.id);
      alert(`Invitation sent to ${email} as ${role}!`);
      return data;
    } catch (err) {
      console.error("Failed to invite member:", err);
      throw err;
    }
  };

  const acceptInvitation = async (invitationId) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc("accept_organization_invitation", {
        p_invitation_id: invitationId
      });

      if (error) throw error;

      console.log("[Workspace] Invitation accepted successfully:", data);

      await refreshOrganizations();
      const newOrgId = data.organization_id;
      await switchOrganization(newOrgId);

      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      alert(`Successfully joined ${data.organization_name || "the workspace"}!`);
    } catch (err) {
      console.error("Failed to accept invitation:", err);
      alert("Failed to accept invitation: " + err.message);
    }
  };

  const declineInvitation = async (invitationId) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc("decline_organization_invitation", {
        p_invitation_id: invitationId
      });

      if (error) throw error;

      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      alert("Invitation declined.");
    } catch (err) {
      console.error("Failed to decline invitation:", err);
      alert("Failed to decline invitation: " + err.message);
    }
  };

  const revokeInvitation = async (invitationId) => {
    if (!user || !currentOrganization) return;
    if (organizationRole !== "Owner" && organizationRole !== "Admin") {
      alert("Only organization Owners and Admins can revoke invitations.");
      return;
    }
    try {
      const { error } = await supabase
        .from("organization_invitations")
        .update({ status: "revoked" })
        .eq("id", invitationId)
        .eq("organization_id", currentOrganization.id);
      
      if (error) throw error;
      
      await logAudit("Invitation Revoked", "organization_invitations", invitationId);
      await fetchOrgInvitations(currentOrganization.id);
      alert("Invitation revoked successfully.");
    } catch (err) {
      console.error("Failed to revoke invitation:", err);
      alert("Failed to revoke invitation: " + err.message);
    }
  };

  // Alias for backward compatibility
  const cancelInvitation = revokeInvitation;

  const resendInvitation = async (invitationId) => {
    if (!user || !currentOrganization) return;
    if (organizationRole !== "Owner" && organizationRole !== "Admin") {
      alert("Only organization Owners and Admins can resend invitations.");
      return;
    }
    try {
      const { error } = await supabase
        .from("organization_invitations")
        .update({ created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
        .eq("id", invitationId)
        .eq("organization_id", currentOrganization.id);
      
      if (error) throw error;
      
      await logAudit("Member Invited", "organization_invitations", invitationId, { resent: true });
      await fetchOrgInvitations(currentOrganization.id);
      alert("Invitation resent successfully!");
    } catch (err) {
      console.error("Failed to resend invitation:", err);
      alert("Failed to resend invitation: " + err.message);
    }
  };

  const changeMemberRole = async (memberId, newRole) => {
    if (!user || !currentOrganization) return;
    
    if (organizationRole !== "Owner" && organizationRole !== "Admin") {
      alert("Only organization Owners and Admins may modify roles.");
      return;
    }

    const member = organizationMembers.find(m => m.id === memberId);
    if (!member) {
      alert("Member not found.");
      return;
    }

    // Restriction: Admin changing Owner role is disallowed
    if (member.role === "Owner" && organizationRole === "Admin") {
      alert("Only Owners can modify another Owner's role.");
      return;
    }

    // Restriction: Last Owner cannot be demoted
    if (member.role === "Owner" && newRole !== "Owner") {
      const ownerCount = organizationMembers.filter(m => m.role === "Owner").length;
      if (ownerCount <= 1) {
        alert("The organization must have at least one Owner. You cannot demote the last Owner.");
        return;
      }
    }

    try {
      const { error } = await supabase
        .from("organization_members")
        .update({ role: newRole })
        .eq("id", memberId)
        .eq("organization_id", currentOrganization.id);
      
      if (error) throw error;
      
      await logAudit("Role Changed", "organization_members", memberId, { prevRole: member.role, newRole });
      await fetchOrgMembersAndRole(currentOrganization.id);
      alert("Role updated successfully.");
    } catch (err) {
      console.error("Failed to change member role:", err);
      alert("Failed to update role: " + err.message);
    }
  };

  // Alias for backward compatibility
  const updateMemberRole = changeMemberRole;

  const removeMember = async (memberId) => {
    if (!user || !currentOrganization) return;
    
    if (organizationRole !== "Owner" && organizationRole !== "Admin") {
      alert("Only organization Owners and Admins may remove members.");
      return;
    }

    const member = organizationMembers.find(m => m.id === memberId);
    if (!member) {
      alert("Member not found.");
      return;
    }

    // Restriction: Admin removing Owner is disallowed
    if (member.role === "Owner" && organizationRole === "Admin") {
      alert("Only Owners can remove an Owner from the organization.");
      return;
    }

    // Restriction: Prevent removing last Owner
    if (member.role === "Owner") {
      const ownerCount = organizationMembers.filter(m => m.role === "Owner").length;
      if (ownerCount <= 1) {
        alert("The organization must have at least one Owner. You cannot remove the last Owner.");
        return;
      }
    }

    // Self-removal confirmation
    if (member.user_id === user.id) {
      const confirmSelf = confirm("Are you sure you want to remove yourself from this organization? You will lose access immediately.");
      if (!confirmSelf) return;
    }

    try {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", memberId)
        .eq("organization_id", currentOrganization.id);
      
      if (error) throw error;
      
      await logAudit("Member Removed", "organization_members", memberId, { email: member.profiles?.email || member.user_id });
      
      if (member.user_id === user.id) {
        await fetchUserOrganizations(user.id);
      } else {
        await fetchOrgMembersAndRole(currentOrganization.id);
      }
      alert("Member removed successfully.");
    } catch (err) {
      console.error("Failed to remove member:", err);
      alert("Failed to remove member: " + err.message);
    }
  };

  const refreshMembers = async () => {
    if (currentOrganization) {
      await fetchOrgMembersAndRole(currentOrganization.id);
    }
  };

  const refreshInvitations = async () => {
    if (currentOrganization) {
      await fetchOrgInvitations(currentOrganization.id);
    }
  };

  const updateBranding = async (brandingData) => {
    if (!user || !currentOrganization) return;
    try {
      const { error } = await supabase
        .from("organizations")
        .update(brandingData)
        .eq("id", currentOrganization.id);
      
      if (error) throw error;
      
      setCurrentOrganization(prev => ({ ...prev, ...brandingData }));
      setOrganizations(prev => prev.map(o => o.id === currentOrganization.id ? { ...o, ...brandingData } : o));
      await logAudit("Branding Updated", "organizations", currentOrganization.id, brandingData);
    } catch (err) {
      console.error("Failed to update branding:", err);
      alert("Failed to update settings: " + err.message);
    }
  };

  // --- Executive AI Agent Command & Execution Actions ---
  const executeAgentCommand = async (command) => {
    if (!hasPermission(organizationRole, PERMISSIONS.RUN_AI_AGENT)) {
      const errMsg = "Forbidden: You do not have permission to run AI agent commands.";
      alert(errMsg);
      throw new Error(errMsg);
    }

    try {
      const res = await fetch("/api/agent/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, organizationId: currentOrganization?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to execute command");
      return data;
    } catch (err) {
      console.error("Error executing agent command:", err);
      throw err;
    }
  };

  const approveAgentTask = async (taskId) => {
    if (!hasPermission(organizationRole, PERMISSIONS.EXECUTE_AGENT_TASKS)) {
      const errMsg = "Forbidden: You do not have permission to execute AI agent tasks.";
      alert(errMsg);
      throw new Error(errMsg);
    }

    try {
      const res = await fetch("/api/agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to execute task");
      
      setAgentTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: data.status, logs: `${t.logs}\n${data.logs}` } : t));
      await logActivity("system", `Approved AI Agent task execution: ${taskId}`);
      return data;
    } catch (err) {
      console.error("Error executing task:", err);
      alert("Failed to execute task: " + err.message);
      throw err;
    }
  };

  const rejectAgentTask = async (taskId) => {
    if (!hasPermission(organizationRole, PERMISSIONS.EXECUTE_AGENT_TASKS)) {
      const errMsg = "Forbidden: You do not have permission to reject AI agent tasks.";
      alert(errMsg);
      throw new Error(errMsg);
    }

    try {
      const { error } = await supabase
        .from("agent_tasks")
        .update({ status: "rejected", logs: `Task rejected by user at ${new Date().toISOString()}.` })
        .eq("id", taskId)
        .eq("organization_id", currentOrganization?.id);

      if (error) throw error;
      
      setAgentTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "rejected" } : t));
      await logActivity("system", `Rejected AI Agent task: ${taskId}`);
    } catch (err) {
      console.error("Error rejecting task:", err);
      alert("Failed to reject task: " + err.message);
      throw err;
    }
  };

  // Sync Google connection status in the integrations list state
  useEffect(() => {
    setIntegrations((prev) =>
      prev.map((item) =>
        item.id === "calendar"
          ? {
              ...item,
              connected: googleConnected,
              lastActivity: googleConnected ? "Connected to Google Calendar" : "Connection terminated"
            }
          : item
      )
    );
  }, [googleConnected]);

  return (
    <ElevateAppContext.Provider
      value={{
        currentView,
        setCurrentView,
        dashboardSection,
        setDashboardSection,
        demoIndustry,
        setDemoIndustry,
        user,
        loadingAuth,
        signInWithGoogle,
        signInWithGithub,
        signUpWithEmail,
        signInWithEmail,
        resetPassword,
        logOut,
        organizations,
        currentOrganization,
        organizationMembers,
        organizationRole,
        organizationInvitations,
        pendingInvitations,
        loadingOrg,
        selectOrganization,
        switchOrganization,
        refreshOrganizations,
        isSwitchingWorkspace,
        createOrganization,
        inviteMember,
        acceptInvitation,
        declineInvitation,
        revokeInvitation,
        cancelInvitation,
        resendInvitation,
        changeMemberRole,
        updateMemberRole,
        removeMember,
        refreshMembers,
        refreshInvitations,
        updateBranding,
        leads,
        loadingLeads,
        leadsError,
        notifications,
        setNotifications,
        tickets,
        integrations,
        workflows,
        activities,
        billingPlan,
        appointments,
        navigateTo,
        addLead,
        updateLeadStatus,
        removeLead,
        updateLead,
        createTicket,
        updateTicketStatus,
        toggleIntegration,
        toggleWorkflow,
        logActivity,
        bookAppointment,
        googleConnected,
        loadingAppointments,
        bookGoogleMeeting,
        cancelGoogleMeeting,
        disconnectGoogleCalendar,
        tasks,
        loadingTasks,
        followups,
        loadingFollowups,
        toggleTaskCompletion,
        generateFollowup,
        generateDailyTasks,
        campaigns,
        campaignRecipients,
        campaignEvents,
        setCampaignEvents,
        sequences,
        loadingCampaigns,
        generateCampaign,
        createCampaign,
        updateCampaign,
        deleteCampaign,
        sendCampaign,
        generateCampaignEmail,
        getCampaignAnalytics,
        generateSequence,
        toggleSequenceActive,
        followupSequences,
        followupSteps,
        followupExecutions,
        loadingFollowups,
        createFollowupSequence,
        updateFollowupSequence,
        deleteFollowupSequence,
        scheduleFollowup,
        cancelFollowup,
        executeFollowup,
        agentTasks,
        agentMemories,
        loadingAgentTasks,
        executeAgentCommand,
        approveAgentTask,
        rejectAgentTask,
        deals,
        proposals,
        contracts,
        forecasts,
        loadingDeals,
        loadingProposals,
        loadingContracts,
        loadingForecasts,
        createDeal,
        updateDeal,
        generateProposal,
        generateContract,
        hasPermission,
        canAccessResource,
        PERMISSIONS,
      }}
    >
      {children}
    </ElevateAppContext.Provider>
  );
}

export function useElevate() {
  const context = useContext(ElevateAppContext);
  if (!context) {
    throw new Error("useElevate must be used within an ElevateAppProvider");
  }
  return context;
}
