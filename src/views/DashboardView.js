"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useElevate } from "@/components/Context";
import { 
  LayoutDashboard, Users, FileText, BarChart2, MessageSquare, Zap, Clock, 
  Calendar, CreditCard, Key, Settings, HelpCircle, Phone, Sparkles, 
  Trash2, Eye, Plus, ArrowRight, CheckCircle2, ChevronRight, ChevronDown, Play, Globe, Terminal, Mail, LogOut, Copy, Send, Bot, Brain,
  DollarSign, TrendingUp, AlertTriangle, FileSpreadsheet, Scale, Edit3, Award, Download, Repeat
} from "lucide-react";
import { 
  RevenuePipelineChart, LeadConversionChart, WeeklyConversionBarChart,
  DealStageDistributionChart, WinLossRatioChart, RevenueForecastTrendChart,
  RepLeaderboardChart, TeamWinRateChart, ActivityHeatmapChart, TeamForecastChart
} from "@/components/SVGCharts";
import LeadDrawer from "@/components/LeadDrawer";
import DealDrawer from "@/components/DealDrawer";
import { hasPermission, canAccessResource, PERMISSIONS } from "@/lib/rbac";

export default function DashboardView() {
  console.log("DASHBOARDVIEW RENDERING");
  const {
    dashboardSection,
    setDashboardSection,
    demoIndustry,
    setDemoIndustry,
    leads,
    tickets,
    integrations,
    workflows,
    activities,
    billingPlan,
    appointments,
    navigateTo,
    addLead,
    updateLead,
    updateLeadStatus,
    removeLead,
    createTicket,
    updateTicketStatus,
    toggleIntegration,
    toggleWorkflow,
    bookAppointment,
    user,
    logOut,
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
    loadingCampaigns,
    followupSequences,
    followupSteps,
    followupExecutions,
    createFollowupSequence,
    updateFollowupSequence,
    deleteFollowupSequence,
    scheduleFollowup,
    cancelFollowup,
    executeFollowup,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    sendCampaign,
    generateCampaignEmail,
    getCampaignAnalytics,
    sequences,
    generateSequence,
    toggleSequenceActive,
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
    createDeal,
    updateDeal,
    generateProposal,
    generateContract,
    organizations,
    currentOrganization,
    organizationMembers,
    organizationRole,
    organizationInvitations,
    pendingInvitations,
    loadingOrg,
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
  } = useElevate();

  // Phase 9 SaaS & Organization States
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardOrgName, setWizardOrgName] = useState("");
  const [wizardOrgIndustry, setWizardOrgIndustry] = useState("AI Operations");
  const [wizardTeamSize, setWizardTeamSize] = useState("1-5");
  const [wizardLeadsText, setWizardLeadsText] = useState("");
  const [wizardCalendarConnected, setWizardCalendarConnected] = useState(false);
  const [wizardBrandingColor, setWizardBrandingColor] = useState("#C5A028");
  const [wizardLogoUrl, setWizardLogoUrl] = useState("");
  const [wizardCustomDomain, setWizardCustomDomain] = useState("");
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  // Ref guard: once the user completes or explicitly closes onboarding, never auto-reopen it
  const hasCompletedOnboardingRef = React.useRef(false);

  const [auditLogs, setAuditLogs] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Sales Rep");
  const [teamPerformance, setTeamPerformance] = useState([]);
  const [showOrgSwitcherDropdown, setShowOrgSwitcherDropdown] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState("overview");
  const [analyticsTeamTab, setAnalyticsTeamTab] = useState("overview");
  const [leaderboardSort, setLeaderboardSort] = useState({ col: "teamScore", dir: "desc" });
  const [settingsOrgName, setSettingsOrgName] = useState("");
  const [settingsLogoUrl, setSettingsLogoUrl] = useState("");
  const [settingsPrimaryColor, setSettingsPrimaryColor] = useState("#C5A028");
  const [settingsCustomDomain, setSettingsCustomDomain] = useState("");

  // Phase 10 Step 2 Follow-Up Engine States
  const [activeFollowupTab, setActiveFollowupTab] = useState("dashboard");
  const [followupSeqName, setFollowupSeqName] = useState("");
  const [followupSeqDescription, setFollowupSeqDescription] = useState("");
  const [followupSeqSteps, setFollowupSeqSteps] = useState([
    { delay_days: 0, step_type: "initial", subject_template: "Outreach: {{company}}", body_template: "<p>Hi {{name}},</p><p>I noticed your company {{company}} is expanding sales. Let's connect.</p>" }
  ]);
  const [selectedFollowupSequenceId, setSelectedFollowupSequenceId] = useState(null);
  const [followupStatusFilter, setFollowupStatusFilter] = useState("all");
  const [selectedLeadIdForTimeline, setSelectedLeadIdForTimeline] = useState(null);
  const [isExecutingFollowupId, setIsExecutingFollowupId] = useState(null);
  // Manual scheduling modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleModalLeadId, setScheduleModalLeadId] = useState("");
  const [scheduleModalSeqId, setScheduleModalSeqId] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  // Monitor: manual schedule panel
  const [monitorPickLeadId, setMonitorPickLeadId] = useState("");
  const [monitorPickSeqId, setMonitorPickSeqId] = useState("");
  const [isMonitorScheduling, setIsMonitorScheduling] = useState(false);

  // Sync settings inputs when organization changes
  useEffect(() => {
    if (currentOrganization) {
      setSettingsOrgName(currentOrganization.name || "");
      setSettingsLogoUrl(currentOrganization.logo_url || "");
      setSettingsPrimaryColor(currentOrganization.primary_color || "#C5A028");
      setSettingsCustomDomain(currentOrganization.custom_domain || "");
    }
  }, [currentOrganization]);

  // Onboarding Wizard Auto-Trigger for New Users
  useEffect(() => {
    console.log("[Onboarding Trigger check]", { loadingOrg, orgsLength: organizations.length, userEmail: user?.email, completed: hasCompletedOnboardingRef.current });
    // Only auto-open if: user is loaded, org loading is done, no orgs exist, AND we haven't already completed onboarding
    if (!loadingOrg && organizations.length === 0 && user && !hasCompletedOnboardingRef.current) {
      console.log("[Onboarding Trigger] Conditions met — showing onboarding wizard.");
      setShowOnboardingWizard(true);
      setWizardStep(1);
    }
  }, [loadingOrg, organizations, user]);

  // Fetch Audit Logs when team section is open
  useEffect(() => {
    if (currentOrganization && dashboardSection === "team") {
      const fetchLogs = async () => {
        const { data, error } = await supabase
          .from("organization_audit_logs")
          .select("*")
          .eq("organization_id", currentOrganization.id)
          .order("created_at", { ascending: false })
          .limit(20);
        if (!error && data) {
          setAuditLogs(data);
        }
      };
      fetchLogs();
    }
  }, [currentOrganization, dashboardSection]);

  // Aggregate team performance stats client-side in real-time
  useEffect(() => {
    if (currentOrganization && (dashboardSection === "analytics" || dashboardSection === "team")) {
      const rawStats = organizationMembers.map(m => {
        const memberLeads = leads.filter(l => l.owner_id === m.user_id);
        const memberDeals = deals.filter(d => d.owner_id === m.user_id);
        const wonDeals = memberDeals.filter(d => d.stage === "Won");
        const pipelineDeals = memberDeals.filter(d => d.stage !== "Won" && d.stage !== "Lost");
        const pipelineValue = pipelineDeals.reduce((acc, d) => acc + Number(d.value || 0), 0);
        const wonRevenue = wonDeals.reduce((acc, d) => acc + Number(d.value || 0), 0);
        const closedWonLeads = memberLeads.filter(l => l.status === "Closed Won");
        const conversionRate = memberLeads.length > 0 ? Math.round((closedWonLeads.length / memberLeads.length) * 100) : 0;
        const winRate = memberLeads.length > 0 ? Math.round((wonDeals.length / memberLeads.length) * 100) : 0;
        const memberAppointments = appointments.filter(a => a.user_id === m.user_id);
        return {
          id: m.id,
          user_id: m.user_id,
          name: m.profiles?.full_name || m.profiles?.email?.split("@")[0] || "User",
          role: m.role,
          email: m.profiles?.email || "Unknown",
          leadsCount: memberLeads.length,
          wonCount: wonDeals.length,
          wonRevenue,
          pipelineValue,
          conversionRate,
          winRate,
          appointmentsCount: memberAppointments.length,
          teamScore: 0, // computed below after knowing maxes
        };
      });

      // Compute normalized team score: 0.40(WinRate) + 0.30(Revenue) + 0.20(Pipeline) + 0.10(Activity)
      const topRevenue = Math.max(...rawStats.map(s => s.wonRevenue), 1);
      const topPipeline = Math.max(...rawStats.map(s => s.pipelineValue), 1);
      const topAppointments = Math.max(...rawStats.map(s => s.appointmentsCount), 1);

      const withScore = rawStats.map(s => ({
        ...s,
        teamScore: Math.round(
          0.40 * (s.winRate) +
          0.30 * (s.wonRevenue / topRevenue * 100) +
          0.20 * (s.pipelineValue / topPipeline * 100) +
          0.10 * (s.appointmentsCount / topAppointments * 100)
        )
      }));

      setTeamPerformance(withScore);
    }
  }, [currentOrganization, dashboardSection, organizationMembers, leads, deals, appointments]);

  // Resolve user info from organizationMembers locally
  const getAuditUserString = (logUserId) => {
    const member = organizationMembers.find(m => m.user_id === logUserId);
    if (member) {
      return member.profiles?.full_name || member.profiles?.email || "Team Member";
    }
    return logUserId ? "System / Agent" : "System";
  };

  // Selected lead for "Lead Details View"
  const [selectedLeadId, setSelectedLeadId] = useState(null);

  // Phase 8 States
  const [selectedDealId, setSelectedDealId] = useState(null);
  const [proposalDealId, setProposalDealId] = useState("");
  const [contractDealId, setContractDealId] = useState("");
  const [revenueTab, setRevenueTab] = useState("dashboard"); // dashboard, pipeline, proposals, contracts
  const [editingProposalId, setEditingProposalId] = useState(null);
  const [editingProposalContent, setEditingProposalContent] = useState("");
  const [editingProposalTitle, setEditingProposalTitle] = useState("");
  const [editingContractId, setEditingContractId] = useState(null);
  const [editingContractContent, setEditingContractContent] = useState("");
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);

  // Drag and drop for deals
  const [draggedOverDealStage, setDraggedOverDealStage] = useState(null);

  const handleDealDragStart = (e, dealId) => {
    e.dataTransfer.setData("text/plain", dealId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDealDragOver = (e) => {
    e.preventDefault();
  };

  const handleDealDragEnter = (e, stage) => {
    e.preventDefault();
    setDraggedOverDealStage(stage);
  };

  const handleDealDragLeave = () => {
    setDraggedOverDealStage(null);
  };

  const handleDealDrop = async (e, targetStage) => {
    e.preventDefault();
    setDraggedOverDealStage(null);
    const dealId = e.dataTransfer.getData("text/plain");
    if (!dealId) return;

    try {
      await updateDeal(dealId, { stage: targetStage, status: (targetStage === "Won" ? "won" : targetStage === "Lost" ? "lost" : "open") });
    } catch (err) {
      console.error("Failed to move deal card via drag & drop:", err);
    }
  };

  // Booking Form State
  const [bookingTitle, setBookingTitle] = useState("");
  const [bookingStartTime, setBookingStartTime] = useState("");
  const [bookingEndTime, setBookingEndTime] = useState("");
  const [bookingDescription, setBookingDescription] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  // --- Campaign Center State ---
  const [activeCampaignTab, setActiveCampaignTab] = useState("dashboard"); // dashboard, builder, sequences
  const [campaignName, setCampaignName] = useState("");
  const [campaignGoal, setCampaignGoal] = useState("");
  const [campaignAudience, setCampaignAudience] = useState("");
  const [campaignOffer, setCampaignOffer] = useState("");
  const [campaignTone, setCampaignTone] = useState("professional");
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignBody, setCampaignBody] = useState("");
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [crmScoreFilter, setCrmScoreFilter] = useState("All"); // All, Hot, Warm, Cold
  
  const [seqName, setSeqName] = useState("");
  const [seqGoal, setSeqGoal] = useState("");
  const [isGeneratingSeq, setIsGeneratingSeq] = useState(false);
  const [activeSeqId, setActiveSeqId] = useState(null);
  const [searchLeadQuery, setSearchLeadQuery] = useState("");

  // --- Agent Center State ---
  const [activeAgentTab, setActiveAgentTab] = useState("dashboard"); // dashboard, tasks, memories
  const [commandText, setCommandText] = useState("");
  const [commandLogs, setCommandLogs] = useState([
    { type: "agent", text: "Elevate AI Sales Agent initialized. Online and awaiting command instructions." }
  ]);
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);

  // Helper: toggle select lead
  const toggleSelectLead = (leadId) => {
    setSelectedLeadIds(prev => 
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  // Helper: select all leads
  const selectAllLeads = () => {
    const leadsWithEmail = leads.filter(l => l.email).map(l => l.id);
    if (selectedLeadIds.length === leadsWithEmail.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leadsWithEmail);
    }
  };

  // Call AI Copywriting Generation for single-template
  const handleGenerateAI = async () => {
    if (!campaignGoal.trim() || !campaignAudience.trim() || !campaignOffer.trim()) {
      alert("Please fill in Goal, Audience, and Offer fields.");
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateCampaignEmail(campaignGoal, campaignAudience, campaignOffer, campaignTone);
      if (result.success && result.data) {
        setCampaignSubject(result.data.subject || "");
        setCampaignBody(result.data.body || "");
        alert("Copy generated successfully! You can review or tweak it in the fields below.");
      } else {
        throw new Error("Invalid response structure from AI Copywriter.");
      }
    } catch (err) {
      alert("Failed to generate template copy: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Launch Campaign (Save and Send)
  const handleLaunchCampaign = async () => {
    if (!campaignName.trim()) {
      alert("Please enter a campaign name.");
      return;
    }
    if (selectedLeadIds.length === 0) {
      alert("Please select at least one recipient.");
      return;
    }
    if (!campaignSubject.trim() || !campaignBody.trim()) {
      alert("Please generate or enter campaign copy (Subject & Body).");
      return;
    }

    setIsSending(true);
    try {
      const campaignId = await createCampaign(campaignName, campaignSubject, campaignBody, selectedLeadIds);
      const result = await sendCampaign(campaignId);
      alert(result.message || "Campaign launched successfully!");
      
      // Reset builder form
      setCampaignName("");
      setCampaignGoal("");
      setCampaignAudience("");
      setCampaignOffer("");
      setCampaignTone("professional");
      setCampaignSubject("");
      setCampaignBody("");
      setSelectedLeadIds([]);
      setActiveCampaignTab("dashboard");
    } catch (err) {
      alert("Launch failed: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  // Save Draft (Save only)
  const handleSaveDraft = async () => {
    if (!campaignName.trim()) {
      alert("Please enter a campaign name.");
      return;
    }
    if (selectedLeadIds.length === 0) {
      alert("Please select at least one recipient.");
      return;
    }
    setIsSending(true);
    try {
      await createCampaign(campaignName, campaignSubject, campaignBody, selectedLeadIds);
      alert("Campaign draft saved successfully!");
      
      // Reset builder form
      setCampaignName("");
      setCampaignGoal("");
      setCampaignAudience("");
      setCampaignOffer("");
      setCampaignTone("professional");
      setCampaignSubject("");
      setCampaignBody("");
      setSelectedLeadIds([]);
      setActiveCampaignTab("dashboard");
    } catch (err) {
      alert("Failed to save draft: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  // Sequence generation
  const handleGenerateSeq = async () => {
    if (!seqName.trim() || !seqGoal.trim()) {
      alert("Please enter sequence name and goal.");
      return;
    }
    setIsGeneratingSeq(true);
    try {
      const result = await generateSequence(seqName, seqGoal);
      alert(`Sequence '${result.sequence.name}' generated and saved!`);
      setSeqName("");
      setSeqGoal("");
      setActiveSeqId(result.sequence.id);
    } catch (err) {
      alert("Failed to generate sequence: " + err.message);
    } finally {
      setIsGeneratingSeq(false);
    }
  };

  useEffect(() => {
    if (selectedLeadId) {
      const lead = leads.find((l) => l.id === selectedLeadId);
      if (lead) {
        setBookingTitle(`Elevate AI Strategy Session with ${lead.name}`);
        // Default start time: tomorrow at 10:00 AM local time
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        
        // Format as YYYY-MM-DDTHH:MM for datetime-local input
        const pad = (num) => String(num).padStart(2, '0');
        const formattedStart = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`;
        setBookingStartTime(formattedStart);

        // Default end time: tomorrow at 11:00 AM local time
        tomorrow.setHours(11, 0, 0, 0);
        const formattedEnd = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`;
        setBookingEndTime(formattedEnd);

        setBookingDescription(`Discuss custom pipeline automation solutions for ${lead.company || lead.name}.`);
      }
    }
  }, [selectedLeadId, leads]);

  const handleBookMeeting = async (e) => {
    e.preventDefault();
    if (!selectedLeadId) return;

    if (!bookingTitle || !bookingStartTime || !bookingEndTime) {
      alert("Please fill in all required fields (Title, Start Time, and End Time).");
      return;
    }

    if (new Date(bookingStartTime) >= new Date(bookingEndTime)) {
      alert("Start time must be before the end time.");
      return;
    }

    try {
      setBookingLoading(true);
      await bookGoogleMeeting({
        leadId: selectedLeadId,
        title: bookingTitle,
        startTime: new Date(bookingStartTime).toISOString(),
        endTime: new Date(bookingEndTime).toISOString(),
        description: bookingDescription,
      });
      alert("Success! Your consultation has been scheduled.");
    } catch (err) {
      console.error(err);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleIntegrationToggle = (id) => {
    if (id === "calendar") {
      if (googleConnected) {
        disconnectGoogleCalendar();
      } else {
        if (user) {
          window.location.href = `/api/google/auth?state=${user.id}`;
        } else {
          alert("Please sign in to connect Google Calendar.");
        }
      }
    } else {
      toggleIntegration(id);
    }
  };

  // AI Qualification helpers
  const hasBeenAIQualified = (notesText) => {
    return notesText && notesText.includes("[AI Reason]:");
  };

  const parseLeadNotes = (notesText) => {
    if (!notesText) return { reasoning: "", nextAction: "", original: "" };
    
    const reasonMatch = notesText.match(/\[AI Reason\]:\s*([\s\S]*?)(?=\n\[Next Action\]:|\n----------------------------------------|$)/);
    const actionMatch = notesText.match(/\[Next Action\]:\s*([\s\S]*?)(?=\n----------------------------------------|\n\[AI Reason\]:|$)/);
    const originalMatch = notesText.match(/----------------------------------------\s*\n?\[Original Notes\]:\s*([\s\S]*)$/);
    
    return {
      reasoning: reasonMatch ? reasonMatch[1].trim() : "",
      nextAction: actionMatch ? actionMatch[1].trim() : "",
      original: originalMatch ? originalMatch[1].trim() : notesText
    };
  };

  const getAIQualificationBadge = (score, notes) => {
    if (!hasBeenAIQualified(notes)) {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          minHeight: "22px",
          padding: "0 8px",
          borderRadius: "999px",
          background: "rgba(255, 255, 255, 0.04)",
          color: "var(--text-muted)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          fontSize: "0.7rem",
          fontWeight: "500",
          letterSpacing: "0.02em"
        }}>
          ⏳ Qualifying...
        </span>
      );
    }
    if (score >= 80) {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          minHeight: "22px",
          padding: "0 8px",
          borderRadius: "999px",
          background: "rgba(109, 201, 165, 0.12)",
          color: "var(--accent-emerald)",
          border: "1px solid rgba(109, 201, 165, 0.2)",
          fontSize: "0.7rem",
          fontWeight: "600",
          letterSpacing: "0.02em"
        }}>
          🔥 Hot
        </span>
      );
    } else if (score >= 50) {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          minHeight: "22px",
          padding: "0 8px",
          borderRadius: "999px",
          background: "rgba(214, 178, 74, 0.12)",
          color: "var(--accent-gold)",
          border: "1px solid rgba(214, 178, 74, 0.2)",
          fontSize: "0.7rem",
          fontWeight: "600",
          letterSpacing: "0.02em"
        }}>
          ⚡ Warm
        </span>
      );
    } else {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          minHeight: "22px",
          padding: "0 8px",
          borderRadius: "999px",
          background: "rgba(255, 255, 255, 0.06)",
          color: "var(--text-muted)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          fontSize: "0.7rem",
          fontWeight: "600",
          letterSpacing: "0.02em"
        }}>
          ❄️ Cold
        </span>
      );
    }
  };

  // States for integrations configuration modals
  const [activeConfigModal, setActiveConfigModal] = useState(null);
  const [wpUrl, setWpUrl] = useState("https://mywebsite.com");
  const [apiSecret, setApiSecret] = useState("el_sk_live_9f83ea0e417850a");

  // States for creating a lead inside Leads dashboard panel
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadCompany, setNewLeadCompany] = useState("");
  const [newLeadSource, setNewLeadSource] = useState("Website Form");
  const [newLeadNotes, setNewLeadNotes] = useState("Manually registered inside SaaS dashboard panel.");
  const [newLeadIndustry, setNewLeadIndustry] = useState("gym");
  const [newLeadValue, setNewLeadValue] = useState(1200);

  // AI assistant sandbox follow-up generation states
  const [aiAssistantPrompt, setAiAssistantPrompt] = useState("Generate follow-up WhatsApp message");
  const [aiAssistantResult, setAiAssistantResult] = useState("");

  // AI assistant sandbox conversational chat states
  const [messages, setMessages] = useState([
    { bot: true, text: "Welcome to Elevate B2B Growth AI Assistant. I can draft high-conversion email copywriting, score custom downpayments, or review CRM logs. What can I calculate for you today?" }
  ]);
  const [userMsg, setUserMsg] = useState("");

  // Setup lead search, filters, and drawer states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStage, setFilterStage] = useState("All");
  const [filterAIScore, setFilterAIScore] = useState("All");
  const [filterDateRange, setFilterDateRange] = useState("All");

  // Drag and Drop implementation
  const [draggedOverStage, setDraggedOverStage] = useState(null);

  const handleDragStart = (e, leadId) => {
    e.dataTransfer.setData("text/plain", leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnter = (e, stage) => {
    e.preventDefault();
    setDraggedOverStage(stage);
  };

  const handleDragLeave = () => {
    setDraggedOverStage(null);
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    setDraggedOverStage(null);
    const leadId = e.dataTransfer.getData("text/plain");
    if (!leadId) return;

    try {
      await updateLead(leadId, { status: targetStage });
    } catch (err) {
      console.error("Failed to move card via drag & drop:", err);
    }
  };

  // Filters calculation helper
  const getFilteredLeads = () => {
    return leads.filter((lead) => {
      const query = searchQuery.toLowerCase();
      const matchesQuery =
        lead.name.toLowerCase().includes(query) ||
        lead.email.toLowerCase().includes(query) ||
        (lead.company && lead.company.toLowerCase().includes(query));

      const matchesStage = filterStage === "All" || lead.status === filterStage;

      const score = Number(lead.ai_score !== undefined ? lead.ai_score : lead.score) || 0;
      let matchesScore = true;
      if (filterAIScore === "Hot") {
        matchesScore = score >= 80;
      } else if (filterAIScore === "Warm") {
        matchesScore = score >= 50 && score < 80;
      } else if (filterAIScore === "Cold") {
        matchesScore = score < 50;
      }

      let matchesDate = true;
      if (filterDateRange !== "All") {
        const leadDate = lead.created_at ? new Date(lead.created_at) : new Date();
        const now = new Date();
        const diffTime = Math.abs(now - leadDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (filterDateRange === "7days") {
          matchesDate = diffDays <= 7;
        } else if (filterDateRange === "30days") {
          matchesDate = diffDays <= 30;
        }
      }

      return matchesQuery && matchesStage && matchesScore && matchesDate;
    });
  };

  const handleCreateLeadSubmit = async (e) => {
    e.preventDefault();
    if (!newLeadName || !newLeadEmail) return;

    try {
      await addLead({
        name: newLeadName,
        email: newLeadEmail,
        phone: newLeadPhone || "+91 63743 85901",
        company: newLeadCompany || null,
        industry: newLeadIndustry,
        value: parseInt(newLeadValue) || 1000,
        source: newLeadSource,
        notes: newLeadNotes
      });
      alert("Lead saved to Supabase successfully!");
      setNewLeadName("");
      setNewLeadEmail("");
      setNewLeadPhone("");
      setNewLeadCompany("");
      setNewLeadSource("Website Form");
      setNewLeadNotes("Manually registered inside SaaS dashboard panel.");
      setNewLeadValue(1200);
      setShowAddLeadModal(false);
    } catch (err) {
      alert(`Error saving lead: ${err.message || err}`);
    }
  };

  const generateAIFollowUp = (lead) => {
    if (!lead) return;
    let template = "";
    if (lead.industry === "gym") {
      template = `WhatsApp Script // Gym Assessment Booking
Hi ${lead.name}! I noticed your interest in the '${lead.notes.includes("Annual") ? "Annual Premium Pass" : "VIP membership"}'. Our AI engine evaluated your profile as a high-fit intent match! Let's lock in a 15-minute body composition assessment this Tuesday. Reply 1 to confirm.`;
    } else if (lead.industry === "clinic") {
      template = `WhatsApp Script // Patient Urgency Reminder
Hello ${lead.name}. Your orthopedic specialist consultation is confirmed for Tuesday at 4:00 PM. Please complete your clinical pre-assessment form via the secure HIPAA-protected link before arriving.`;
    } else if (lead.industry === "leather") {
      template = `Email Draft // Bulk Industrial RFQ Estimation
Subject: wholesale RFQ Estimation - Milano Leather Exports
Dear ${lead.name}, thank you for your wholesale inquiry. Our automated quotation analyzer has calculated an estimated budget of $${lead.value.toLocaleString()} USD for the requested cowhide skins skins. We have dispatched leather swatches to your shipping address.`;
    } else {
      template = `WhatsApp Script // Property Downpayment Intent
Hello ${lead.name}, site visit forDLF Camellias has been scheduled for Sunday. Your VIP chauffeur pickup details are logged. Our AI Property Matcher has attached the listing brochure.`;
    }
    setAiAssistantResult(template);
  };

  // --- Subpage Renders ---

  // --- Phase 8: Revenue Intelligence Dashboard Render ---
  const renderRevenueIntelligence = () => {
    // 1. Calculations (using real data)
    const openDeals = deals.filter(d => d.stage !== "Won" && d.stage !== "Lost" && d.status !== "won" && d.status !== "lost");
    const wonDeals = deals.filter(d => d.stage === "Won" || d.status === "won");
    const lostDeals = deals.filter(d => d.stage === "Lost" || d.status === "lost");

    const totalPipelineValue = deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
    const weightedPipelineValue = openDeals.reduce((sum, d) => sum + (Number(d.value) || 0) * ((d.close_probability || 50) / 100), 0);
    
    const currentMonthStr = new Date().toISOString().substring(0, 7);
    const currentForecast = forecasts.find(f => f.forecast_month === currentMonthStr);
    
    // Monthly forecast is either from forecast table or dynamically calculated
    const forecastRevenueValue = currentForecast 
      ? Number(currentForecast.forecast_value) 
      : (weightedPipelineValue + wonDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0));

    const totalDealsCount = deals.length;
    const winRate = totalDealsCount > 0 ? Math.round((wonDeals.length / totalDealsCount) * 100) : 0;
    const avgDealSize = wonDeals.length > 0 ? Math.round(wonDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0) / wonDeals.length) : 0;
    
    // Sales Velocity = (Opportunities * Avg Deal Size * Win Rate) / 30 days
    const avgDealValueOverall = totalDealsCount > 0 ? (deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0) / totalDealsCount) : 0;
    const salesVelocity = Math.round((openDeals.length * avgDealValueOverall * (winRate / 100)) / 30);

    // AI Insights Panel calculations
    const highestRiskDeal = openDeals.filter(d => d.risk_level === "High").sort((a, b) => Number(b.value) - Number(a.value))[0] || openDeals.sort((a,b) => (a.close_probability || 50) - (b.close_probability || 50))[0];
    const mostValuableOpp = openDeals.sort((a,b) => Number(b.value) - Number(a.value))[0];
    const dealsNeedingAttention = openDeals.filter(d => d.risk_level === "High" || (d.close_probability || 50) < 50);

    // print helper
    const printDoc = (title, content) => {
      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: 'Outfit', sans-serif; color: #111; padding: 50px; line-height: 1.6; max-width: 800px; margin: 0 auto; }
              h1, h2, h3 { color: #C5A028; font-weight: 600; }
              p { color: #333; font-size: 0.95rem; }
              hr { border: 0; border-top: 1px solid #ddd; margin: 30px 0; }
              pre { background: #f8f9fa; padding: 20px; border-radius: 6px; border: 1px solid #eee; overflow-x: auto; white-space: pre-wrap; font-family: monospace; }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <hr />
            <div style="white-space: pre-wrap;">${content}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        {/* Navigation Tabs */}
        <div className="tabs-container" style={{ display: "flex", gap: "10px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
          {[
            { id: "dashboard", label: "Executive Dashboard", icon: <LayoutDashboard size={14} /> },
            { id: "pipeline", label: "Deals Kanban Board", icon: <FileSpreadsheet size={14} /> },
            { id: "proposals", label: "Proposal Center", icon: <FileText size={14} /> },
            { id: "contracts", label: "Contract Center", icon: <Award size={14} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setRevenueTab(tab.id)}
              className="btn btn-secondary btn-sm"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: revenueTab === tab.id ? "rgba(214, 178, 74, 0.12)" : "transparent",
                color: revenueTab === tab.id ? "var(--accent-gold)" : "var(--text-muted)",
                border: revenueTab === tab.id ? "1px solid rgba(214, 178, 74, 0.25)" : "1px solid transparent",
                padding: "8px 14px",
                fontSize: "0.8rem",
                fontWeight: "600",
                cursor: "pointer",
                borderRadius: "4px"
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Dashboard Overview */}
        {revenueTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {/* KPI Cards */}
            <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <div className="kpi-card">
                <div className="kpi-label">Total Pipeline</div>
                <div className="kpi-value" style={{ color: "var(--accent-gold)" }}>${totalPipelineValue.toLocaleString()}</div>
                <div className="kpi-trend positive">📈 {deals.length} active opportunities</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Weighted Pipeline</div>
                <div className="kpi-value">${Math.round(weightedPipelineValue).toLocaleString()}</div>
                <div className="kpi-trend positive">✓ Scaled by AI probability</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Forecast Revenue</div>
                <div className="kpi-value" style={{ color: "var(--accent-emerald)" }}>${Math.round(forecastRevenueValue).toLocaleString()}</div>
                <div className="kpi-trend neutral">📅 Projected this month</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Average Win Rate</div>
                <div className="kpi-value">{winRate}%</div>
                <div className="kpi-trend positive">🎯 {wonDeals.length} won / {lostDeals.length} lost</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Avg Deal Size</div>
                <div className="kpi-value">${avgDealSize.toLocaleString()}</div>
                <div className="kpi-trend neutral">Won deals average</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Sales Velocity</div>
                <div className="kpi-value">${salesVelocity.toLocaleString()}/day</div>
                <div className="kpi-trend positive">⚡ Pipeline speed index</div>
              </div>
            </div>

            {/* AI Insights & Visualizations */}
            <div className="grid-2">
              {/* AI Insights Panel */}
              <div className="premium-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px", color: "var(--accent-gold)" }}>
                  <Sparkles size={16} />
                  <span>AI Revenue Insights Panel</span>
                </h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "0.85rem" }}>
                  {highestRiskDeal && (
                    <div style={{ background: "rgba(220, 38, 38, 0.03)", border: "1px solid rgba(220, 38, 38, 0.12)", padding: "12px 14px", borderRadius: "6px" }}>
                      <strong style={{ color: "#ff8b8b", display: "block", marginBottom: "4px" }}>⚠️ Highest Risk Deal</strong>
                      <span style={{ color: "var(--text-primary)" }}>{highestRiskDeal.title}</span> — Value: <strong>${(Number(highestRiskDeal.value) || 0).toLocaleString()}</strong>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px" }}>
                        AI Suggestion: {highestRiskDeal.notes?.includes("[Next Action]:") ? highestRiskDeal.notes.match(/\[Next Action\]:\s*([^\n]*)/)?.[1] : "Schedule follow-up to address pricing risk."}
                      </div>
                    </div>
                  )}

                  {mostValuableOpp && (
                    <div style={{ background: "rgba(214, 178, 74, 0.03)", border: "1px solid rgba(214, 178, 74, 0.12)", padding: "12px 14px", borderRadius: "6px" }}>
                      <strong style={{ color: "var(--accent-gold)", display: "block", marginBottom: "4px" }}>💎 Most Valuable Opportunity</strong>
                      <span style={{ color: "var(--text-primary)" }}>{mostValuableOpp.title}</span> — Value: <strong style={{ color: "var(--accent-gold)" }}>${(Number(mostValuableOpp.value) || 0).toLocaleString()}</strong> (Prob: {mostValuableOpp.close_probability || 50}%)
                    </div>
                  )}

                  <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                    <span style={{ color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Deals Needing Immediate Attention ({dealsNeedingAttention.length}):</span>
                    {dealsNeedingAttention.length === 0 ? (
                      <p style={{ color: "var(--accent-emerald)", fontStyle: "italic", fontSize: "0.8rem", margin: 0 }}>✓ All open deals are showing positive progression metrics.</p>
                    ) : (
                      <ul style={{ paddingLeft: "16px", margin: "4px 0 0 0", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                        {dealsNeedingAttention.slice(0, 3).map(d => (
                          <li key={d.id} style={{ marginBottom: "4px" }}>
                            <span onClick={() => setSelectedDealId(d.id)} style={{ textDecoration: "underline", cursor: "pointer" }}>{d.title}</span> (${(Number(d.value) || 0).toLocaleString()})
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Charts */}
              <div className="premium-card">
                <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "16px" }}>Deal Stage Distribution</h3>
                <DealStageDistributionChart deals={deals} />
              </div>
            </div>

            <div className="grid-2">
              <div className="premium-card">
                <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "16px" }}>Win / Loss Ratio</h3>
                <WinLossRatioChart deals={deals} />
              </div>
              <div className="premium-card">
                <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "16px" }}>Revenue Projections</h3>
                <RevenueForecastTrendChart forecasts={forecasts} />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Deals Kanban Board */}
        {revenueTab === "pipeline" && (
          <div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "20px" }}>
              💡 Drag & drop deals between stages to update their statuses. Click a deal card to open its detail workspace drawer.
            </p>
            <div className="kanban-board">
              {["Lead", "Qualified", "Discovery", "Proposal Sent", "Negotiation", "Won", "Lost"].map((stage) => {
                const stageDeals = deals.filter(d => d.stage === stage);
                const isDraggedOver = draggedOverDealStage === stage;
                return (
                  <div 
                    key={stage} 
                    className="kanban-column"
                    onDragOver={(e) => !isSwitchingWorkspace && handleDealDragOver(e)}
                    onDragEnter={(e) => !isSwitchingWorkspace && handleDealDragEnter(e, stage)}
                    onDragLeave={handleDealDragLeave}
                    onDrop={(e) => !isSwitchingWorkspace && handleDealDrop(e, stage)}
                    style={{
                      transition: "var(--transition-fast)",
                      border: isDraggedOver ? "1px solid var(--accent-gold)" : "1px solid var(--border-color)",
                      boxShadow: isDraggedOver ? "0 0 15px rgba(214, 178, 74, 0.25)" : "none",
                      background: isDraggedOver ? "rgba(214, 178, 74, 0.02)" : "rgba(255, 255, 255, 0.03)",
                      minWidth: "200px"
                    }}
                  >
                    <div className="kanban-header">
                      <span className="kanban-col-name">{stage}</span>
                      <span className="kanban-col-count">{stageDeals.length}</span>
                    </div>

                    <div className="kanban-cards" style={{ minHeight: "450px" }}>
                      {stageDeals.map((dealCard) => (
                        <div 
                          key={dealCard.id} 
                          className="kanban-card"
                          draggable={!isSwitchingWorkspace}
                          onDragStart={(e) => handleDealDragStart(e, dealCard.id)}
                          onClick={() => setSelectedDealId(dealCard.id)}
                          style={{ cursor: isSwitchingWorkspace ? "not-allowed" : "grab" }}
                        >
                          <div className="kanban-card-title">{dealCard.title}</div>
                          {dealCard.leads?.company && (
                            <div style={{ fontSize: "0.75rem", color: "var(--accent-gold)", marginBottom: "4px" }}>
                              {dealCard.leads.company}
                            </div>
                          )}
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                            Lead: {dealCard.leads?.name || "Unlinked"}
                          </div>
                          
                          <div className="kanban-card-meta">
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <span className="badge-score" style={{ background: dealCard.risk_level === "High" ? "rgba(220,38,38,0.15)" : "rgba(255,255,255,0.05)", color: dealCard.risk_level === "High" ? "#ff8b8b" : "var(--text-primary)" }}>
                                {dealCard.close_probability || 50}%
                              </span>
                            </div>
                            <strong style={{ color: "var(--accent-emerald)" }}>
                              ${(Number(dealCard.value) || 0).toLocaleString()}
                            </strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Proposal Center */}
        {revenueTab === "proposals" && (
          <div>
            {editingProposalId ? (
              /* Editing Mode */
              <div className="premium-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--accent-gold)" }}>Proposal Workspace Editor</h4>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => printDoc(editingProposalTitle, editingProposalContent)}
                      style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <Download size={12} />
                      <span>Export PDF</span>
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setEditingProposalId(null)}
                    >
                      Back to proposals
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Proposal Title</label>
                  <input 
                    type="text"
                    value={editingProposalTitle}
                    onChange={(e) => setEditingProposalTitle(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Proposal Details (Markdown Supported)</label>
                  <textarea 
                    value={editingProposalContent}
                    onChange={(e) => setEditingProposalContent(e.target.value)}
                    className="form-input"
                    style={{ minHeight: "350px", fontFamily: "monospace", fontSize: "0.85rem", resize: "vertical" }}
                  />
                </div>

                <button 
                  className="btn btn-gold"
                  onClick={async () => {
                    try {
                      const { supabase } = await import("@/lib/supabase");
                      const { error } = await supabase
                        .from("proposals")
                        .update({ proposal_title: editingProposalTitle, proposal_content: editingProposalContent })
                        .eq("id", editingProposalId);
                      if (error) throw error;
                      alert("Proposal updated successfully!");
                      setEditingProposalId(null);
                    } catch (err) {
                      alert("Failed to save proposal: " + err.message);
                    }
                  }}
                >
                  Save Proposal Document
                </button>
              </div>
            ) : (
              /* List & Generation Mode */
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div className="premium-card" style={{ display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div className="form-group" style={{ marginBottom: 0, flexGrow: 1 }}>
                    <label className="form-label">Select Deal to Generate Proposal</label>
                    <select
                      value={proposalDealId}
                      onChange={(e) => setProposalDealId(e.target.value)}
                      className="form-input"
                      style={{ height: "42px", background: "var(--bg-color)" }}
                    >
                      <option value="">-- Select Deal --</option>
                      {deals.map(d => (
                        <option key={d.id} value={d.id}>{d.title} (${(Number(d.value) || 0).toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="btn btn-gold"
                    style={{ height: "42px", ...(!hasPermission(organizationRole, PERMISSIONS.GENERATE_PROPOSALS) ? { opacity: 0.45, cursor: "not-allowed" } : {}) }}
                    disabled={!proposalDealId || isGeneratingProposal || !hasPermission(organizationRole, PERMISSIONS.GENERATE_PROPOSALS)}
                    title={!hasPermission(organizationRole, PERMISSIONS.GENERATE_PROPOSALS) ? `Role: ${organizationRole} is not permitted to generate proposals.` : undefined}
                    onClick={async () => {
                      if (!hasPermission(organizationRole, PERMISSIONS.GENERATE_PROPOSALS)) return;
                      try {
                        setIsGeneratingProposal(true);
                        await generateProposal(proposalDealId);
                        alert("Proposal successfully drafted by AI!");
                        setProposalDealId("");
                      } catch (err) {
                        alert("Failed to generate proposal: " + err.message);
                      } finally {
                        setIsGeneratingProposal(false);
                      }
                    }}
                  >
                    {isGeneratingProposal ? "Generating..." : "Generate Proposal"}
                  </button>
                </div>

                <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
                  {proposals.length === 0 ? (
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", gridColumn: "1/-1", textAlign: "center", padding: "40px" }}>No proposals generated yet. Draft one above!</p>
                  ) : (
                    proposals.map(p => {
                      const dealObj = deals.find(d => d.id === p.deal_id);
                      return (
                        <div key={p.id} className="premium-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "16px" }}>
                          <div>
                            <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)", display: "block" }}>{p.proposal_title}</strong>
                            <span style={{ fontSize: "0.75rem", color: "var(--accent-gold)", display: "block", marginTop: "4px" }}>
                              Deal: {dealObj?.title || "Unknown"}
                            </span>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
                              Version: {p.proposal_version} • Generated: {new Date(p.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ flexGrow: 1 }}
                              onClick={() => {
                                setEditingProposalId(p.id);
                                setEditingProposalTitle(p.proposal_title);
                                setEditingProposalContent(p.proposal_content);
                              }}
                            >
                              Edit Document
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => printDoc(p.proposal_title, p.proposal_content)}
                              title="Export PDF"
                            >
                              <Download size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Contract Center */}
        {revenueTab === "contracts" && (
          <div>
            {editingContractId ? (
              /* Contract Editing / Signing Workspace */
              <div className="premium-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--accent-emerald)" }}>Service Contract Signature Hub</h4>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => printDoc("Service Agreement", editingContractContent)}
                      style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <Download size={12} />
                      <span>Export PDF</span>
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setEditingContractId(null)}
                    >
                      Back to contracts
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Contract Scope (Markdown Format)</label>
                  <textarea 
                    value={editingContractContent}
                    onChange={(e) => setEditingContractContent(e.target.value)}
                    className="form-input"
                    style={{ minHeight: "350px", fontFamily: "monospace", fontSize: "0.85rem", resize: "vertical" }}
                  />
                </div>

                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", padding: "16px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "12px" }}>
                  <input 
                    type="checkbox"
                    id="signContractCheckbox"
                    checked={contracts.find(c => c.id === editingContractId)?.signed || false}
                    onChange={async (e) => {
                      try {
                        const isSigned = e.target.checked;
                        const { supabase } = await import("@/lib/supabase");
                        const { error } = await supabase
                          .from("contracts")
                          .update({ 
                            signed: isSigned, 
                            signed_at: isSigned ? new Date().toISOString() : null,
                            status: isSigned ? "signed" : "draft"
                          })
                          .eq("id", editingContractId);
                        if (error) throw error;
                        alert(isSigned ? "Contract successfully signed!" : "Contract signature removed.");
                      } catch (err) {
                        alert("Failed to update signature state: " + err.message);
                      }
                    }}
                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                  />
                  <label htmlFor="signContractCheckbox" style={{ fontSize: "0.85rem", cursor: "pointer", color: "var(--text-primary)", fontWeight: "600" }}>
                    Sign Service Agreement Contract
                  </label>
                </div>

                <button 
                  className="btn btn-gold"
                  onClick={async () => {
                    try {
                      const { supabase } = await import("@/lib/supabase");
                      const { error } = await supabase
                        .from("contracts")
                        .update({ contract_content: editingContractContent })
                        .eq("id", editingContractId);
                      if (error) throw error;
                      alert("Contract saved successfully!");
                      setEditingContractId(null);
                    } catch (err) {
                      alert("Failed to save changes: " + err.message);
                    }
                  }}
                >
                  Save Contract Clauses
                </button>
              </div>
            ) : (
              /* Contract Listing & Drafting Hub */
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div className="premium-card" style={{ display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>
                  <div className="form-group" style={{ marginBottom: 0, flexGrow: 1 }}>
                    <label className="form-label">Select Deal to Generate Service Contract</label>
                    <select
                      value={contractDealId}
                      onChange={(e) => setContractDealId(e.target.value)}
                      className="form-input"
                      style={{ height: "42px", background: "var(--bg-color)" }}
                    >
                      <option value="">-- Select Deal --</option>
                      {deals.map(d => (
                        <option key={d.id} value={d.id}>{d.title} (${(Number(d.value) || 0).toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="btn btn-gold"
                    style={{ height: "42px", ...(!hasPermission(organizationRole, PERMISSIONS.GENERATE_CONTRACTS) ? { opacity: 0.45, cursor: "not-allowed" } : {}) }}
                    disabled={!contractDealId || isGeneratingContract || !hasPermission(organizationRole, PERMISSIONS.GENERATE_CONTRACTS)}
                    title={!hasPermission(organizationRole, PERMISSIONS.GENERATE_CONTRACTS) ? `Role: ${organizationRole} is not permitted to generate contracts.` : undefined}
                    onClick={async () => {
                      if (!hasPermission(organizationRole, PERMISSIONS.GENERATE_CONTRACTS)) return;
                      try {
                        setIsGeneratingContract(true);
                        await generateContract(contractDealId);
                        alert("Contract drafted successfully by AI!");
                        setContractDealId("");
                      } catch (err) {
                        alert("Failed to draft contract: " + err.message);
                      } finally {
                        setIsGeneratingContract(false);
                      }
                    }}
                  >
                    {isGeneratingContract ? "Drafting..." : "Generate Contract"}
                  </button>
                </div>

                <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
                  {contracts.length === 0 ? (
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", gridColumn: "1/-1", textAlign: "center", padding: "40px" }}>No contracts drafted yet. Select a deal above!</p>
                  ) : (
                    contracts.map(c => {
                      const dealObj = deals.find(d => d.id === c.deal_id);
                      return (
                        <div key={c.id} className="premium-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "16px" }}>
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                              <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>Service Contract Agreement</strong>
                              <span style={{ 
                                fontSize: "0.65rem", padding: "2px 8px", borderRadius: "999px",
                                background: c.signed ? "rgba(109,201,165,0.12)" : "rgba(214,178,74,0.12)",
                                color: c.signed ? "var(--accent-emerald)" : "var(--accent-gold)",
                                fontWeight: "600"
                              }}>
                                {c.signed ? "Signed" : "Unsigned"}
                              </span>
                            </div>
                            <span style={{ fontSize: "0.75rem", color: "var(--accent-gold)", display: "block", marginTop: "4px" }}>
                              Deal: {dealObj?.title || "Unknown"}
                            </span>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
                              Drafted: {new Date(c.created_at).toLocaleDateString()}
                              {c.signed_at && ` • Signed ${new Date(c.signed_at).toLocaleDateString()}`}
                            </span>
                          </div>

                          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ flexGrow: 1 }}
                              onClick={() => {
                                setEditingContractId(c.id);
                                setEditingContractContent(c.contract_content);
                              }}
                            >
                              Edit & Sign
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => printDoc("Service Contract Agreement", c.contract_content)}
                              title="Export PDF"
                            >
                              <Download size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // 1. OVERVIEW
  const renderOverview = () => {
    const totalPipelineValue = leads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
    const qualifiedCount = leads.filter(l => l.status === "Qualified").length;
    const appointmentsCount = leads.filter(l => l.status === "Appointment Booked").length;
    const closedWonCount = leads.filter(l => l.status === "Closed Won").length;
    const conversionRate = leads.length > 0 ? Math.round((closedWonCount / leads.length) * 100) : 0;
    const avgScore = leads.length > 0 ? Math.round(leads.reduce((sum, l) => sum + (Number(l.ai_score !== undefined ? l.ai_score : l.score) || 0), 0) / leads.length) : 0;

    return (
      <div>
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Total Leads Engine</div>
            <div className="kpi-value">{leads.length}</div>
            <div className="kpi-trend positive">⚡ {avgScore}/100 Avg AI Score</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Qualified Prospects</div>
            <div className="kpi-value">{qualifiedCount}</div>
            <div className="kpi-trend positive">✓ {leads.length > 0 ? Math.round((qualifiedCount / leads.length) * 100) : 0}% qualification index</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Appointments Booked</div>
            <div className="kpi-value">{appointmentsCount}</div>
            <div className="kpi-trend neutral">📅 Google Calendar Connected</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Active Revenue Pipeline</div>
            <div className="kpi-value" style={{ color: "var(--accent-gold)" }}>${totalPipelineValue.toLocaleString()}</div>
            <div className="kpi-trend positive">📈 {conversionRate}% Closed Won rate</div>
          </div>
        </div>

        <div className="grid-2" style={{ marginBottom: "32px" }}>
          <div className="chart-container">
            <div className="chart-header">
              <h3 style={{ fontSize: "1rem", fontWeight: "600" }}>Monthly Pipeline Growth</h3>
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-color gold"></div>
                  <span>Total Value ($)</span>
                </div>
              </div>
            </div>
            <RevenuePipelineChart leads={leads} />
          </div>

          <div className="chart-container">
            <div className="chart-header">
              <h3 style={{ fontSize: "1rem", fontWeight: "600" }}>Lead Conversions Diagnostic</h3>
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-color gold"></div>
                  <span>Captured</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color emerald"></div>
                  <span>AI Qualified</span>
                </div>
              </div>
            </div>
            <LeadConversionChart leads={leads} />
          </div>
        </div>

        {/* Phase 5: AI Sales Automation Section */}
        <div className="grid-2" style={{ marginBottom: "32px", alignItems: "stretch" }}>
          
          {/* Left: AI Daily Tasks Widget */}
          <div className="premium-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Sparkles size={16} style={{ color: "var(--accent-gold)" }} />
                    <span>Today's AI Sales Tasks</span>
                  </h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                    Actionable tasks generated by Gemini to drive deals forward.
                  </p>
                </div>
                <button
                  className="btn btn-gold btn-sm"
                  onClick={async () => {
                    try {
                      alert("Analyzing pipeline & generating sales tasks...");
                      await generateDailyTasks();
                      alert("Daily tasks successfully refreshed!");
                    } catch (err) {
                      alert("Task generation failed: " + err.message);
                    }
                  }}
                  style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                >
                  Generate Tasks
                </button>
              </div>

              {loadingTasks ? (
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>Loading tasks...</p>
              ) : tasks.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-muted)", fontSize: "0.8rem", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-sm)" }}>
                  <Zap size={20} style={{ opacity: 0.3, marginBottom: "8px" }} />
                  <p>No sales tasks generated for today yet. Click "Generate Tasks" to analyze your pipeline.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "400px", overflowY: "auto" }}>
                  {tasks.map(task => {
                    const linkedLead = leads.find(l => l.id === task.lead_id);
                    const isCompleted = task.status === "completed";
                    return (
                      <div
                        key={task.id}
                        style={{
                          background: "var(--surface-color)",
                          border: "1px solid var(--border-color)",
                          padding: "12px 14px",
                          borderRadius: "var(--radius-sm)",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "12px",
                          opacity: isCompleted ? 0.6 : 1,
                          transition: "opacity 0.2s"
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={() => toggleTaskCompletion(task.id, task.status)}
                          style={{ marginTop: "3px", cursor: "pointer" }}
                        />
                        <div style={{ flexGrow: 1 }}>
                          <h5 style={{ fontSize: "0.85rem", fontWeight: "600", margin: 0, textDecoration: isCompleted ? "line-through" : "none", color: "var(--text-primary)" }}>
                            {task.title}
                          </h5>
                          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "4px 0" }}>
                            {task.description}
                          </p>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "6px" }}>
                            <span style={{
                              fontSize: "0.65rem", padding: "1px 6px", borderRadius: "999px",
                              background: task.priority === "High" ? "rgba(220,38,38,0.15)" : task.priority === "Medium" ? "rgba(214,178,74,0.15)" : "rgba(255,255,255,0.05)",
                              color: task.priority === "High" ? "#ff8b8b" : task.priority === "Medium" ? "var(--accent-gold)" : "var(--text-muted)"
                            }}>
                              {task.priority} Priority
                            </span>
                            {linkedLead && (
                              <span
                                onClick={() => setSelectedLeadId(linkedLead.id)}
                                style={{ fontSize: "0.7rem", color: "var(--accent-gold)", textDecoration: "underline", cursor: "pointer" }}
                              >
                                @{linkedLead.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Hot Leads, Follow-ups, and Meetings */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Widget 1: Hot Leads */}
            <div className="premium-card">
              <h3 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Users size={14} style={{ color: "var(--accent-emerald)" }} />
                <span>Hot Leads Pipeline</span>
              </h3>
              {(() => {
                const hotLeads = leads
                  .filter(l => l.priority === "Hot" || (Number(l.score) || 0) >= 80)
                  .sort((a, b) => (b.score || 0) - (a.score || 0))
                  .slice(0, 5);

                if (hotLeads.length === 0) {
                  return <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>No hot leads currently. Qualify prospects to find them.</p>;
                }
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {hotLeads.map(l => (
                      <div
                        key={l.id}
                        onClick={() => setSelectedLeadId(l.id)}
                        style={{
                          background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-color)", padding: "10px 12px", borderRadius: "4px",
                          display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "border-color 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent-gold)"}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border-color)"}
                      >
                        <div>
                          <strong style={{ fontSize: "0.8rem", color: "var(--text-primary)" }}>{l.name}</strong>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "6px" }}>({l.company || "No Company"})</span>
                        </div>
                        <span className="badge-score" style={{ background: "rgba(109,201,165,0.15)", color: "var(--accent-emerald)" }}>{l.score}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Widget 2: Today's Follow-Ups */}
            <div className="premium-card">
              <h3 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <MessageSquare size={14} style={{ color: "var(--accent-gold)" }} />
                <span>Pending Follow-Ups</span>
              </h3>
              {(() => {
                const pendingFollowups = followups
                  .filter(f => f.status === "generated")
                  .slice(0, 3);

                if (pendingFollowups.length === 0) {
                  return <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>No pending follow-ups. Generate some inside a lead's drawer.</p>;
                }
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {pendingFollowups.map(f => {
                      const lead = leads.find(l => l.id === f.lead_id);
                      return (
                        <div
                          key={f.id}
                          onClick={() => { if (lead) setSelectedLeadId(lead.id); }}
                          style={{
                            background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-color)", padding: "10px 12px", borderRadius: "4px",
                            display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "border-color 0.2s"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent-gold)"}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border-color)"}
                        >
                          <div>
                            <strong style={{ fontSize: "0.8rem", color: "var(--text-primary)" }}>{lead?.name || "Prospect"}</strong>
                            <p style={{ margin: "2px 0 0 0", fontSize: "0.7rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>
                              {f.next_action}
                            </p>
                          </div>
                          <span style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: "4px", background: "rgba(214,178,74,0.1)", color: "var(--accent-gold)" }}>Pending</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Widget 3: Upcoming Meetings */}
            <div className="premium-card">
              <h3 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Calendar size={14} style={{ color: "var(--accent-emerald)" }} />
                <span>Upcoming Scheduled Meetings</span>
              </h3>
              {(() => {
                const upcomingApts = appointments
                  .filter(apt => ["upcoming", "confirmed", "pending"].includes(String(apt.status).toLowerCase()))
                  .slice(0, 3);

                if (upcomingApts.length === 0) {
                  return <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>No upcoming scheduled consultations.</p>;
                }
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {upcomingApts.map(apt => {
                      const lead = leads.find(l => l.id === apt.lead_id);
                      return (
                        <div
                          key={apt.id}
                          style={{
                            background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-color)", padding: "10px 12px", borderRadius: "4px",
                            display: "flex", justifyContent: "space-between", alignItems: "center"
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: "0.8rem", color: "var(--text-primary)" }}>{lead?.name || apt.title}</strong>
                            <span style={{ fontSize: "0.7rem", color: "var(--accent-gold)", display: "block" }}>
                              {new Date(apt.start_time).toLocaleString("default", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                            </span>
                          </div>
                          {apt.meet_link && (
                            <a
                              href={apt.meet_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-emerald btn-sm"
                              style={{ padding: "4px 8px", fontSize: "0.65rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}
                            >
                              <Play size={8} /> Join Meet
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

          </div>
        </div>

        <div className="table-container">
          <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "600" }}>Recent Pipeline Activities</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setDashboardSection("leads")}>
              <span>View All Leads</span>
            </button>
          </div>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Prospect</th>
                <th>Industry</th>
                <th>Channel Source</th>
                <th>Score</th>
                <th>Value</th>
                <th>Pipeline Stage</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 5).map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <strong>{lead.name}</strong>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{lead.email}</div>
                  </td>
                  <td style={{ textTransform: "capitalize" }}>{lead.industry}</td>
                  <td>{lead.source}</td>
                  <td>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span className="badge-score">{lead.score}</span>
                      {getAIQualificationBadge(lead.score, lead.notes)}
                    </div>
                  </td>
                  <td style={{ fontWeight: "600" }}>${lead.value.toLocaleString()}</td>
                  <td>
                    <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--accent-gold)" }}>{lead.status}</span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => setSelectedLeadId(lead.id)}
                      style={{ padding: "4px 10px" }}
                      title="View & Edit Details"
                    >
                      <Eye size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 2. LEADS LIST MANAGER
  const renderLeads = () => {
    const filteredLeads = getFilteredLeads();

    return (
      <div>
        {/* Search & Filters Engine Bar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "32px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flexGrow: "1", minWidth: "250px" }}>
              <input 
                type="text" 
                placeholder="Search by name, email, or company..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input" 
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowAddLeadModal(true)}
              disabled={isSwitchingWorkspace || !hasPermission(organizationRole, PERMISSIONS.CREATE_LEADS)}
              title={!hasPermission(organizationRole, PERMISSIONS.CREATE_LEADS) ? `Role: ${organizationRole} is not permitted to create leads.` : undefined}
              style={!hasPermission(organizationRole, PERMISSIONS.CREATE_LEADS) ? { opacity: 0.45, cursor: "not-allowed" } : {}}
            >
              <Plus size={16} />
              <span>New Lead</span>
            </button>
          </div>
          
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "0.85rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "var(--text-muted)" }}>Stage:</span>
              <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="form-input btn-sm" style={{ width: "140px", height: "36px", padding: "4px 8px", background: "rgba(255,255,255,0.03)" }}>
                <option value="All">All Stages</option>
                <option value="New Lead">New Lead</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Appointment Booked">Appointment Booked</option>
                <option value="Closed Won">Closed Won</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "var(--text-muted)" }}>AI Rating:</span>
              <select value={filterAIScore} onChange={(e) => setFilterAIScore(e.target.value)} className="form-input btn-sm" style={{ width: "140px", height: "36px", padding: "4px 8px", background: "rgba(255,255,255,0.03)" }}>
                <option value="All">All Ratings</option>
                <option value="Hot">🔥 Hot (&gt;=80)</option>
                <option value="Warm">⚡ Warm (50-79)</option>
                <option value="Cold">❄️ Cold (&lt;50)</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "var(--text-muted)" }}>Date Range:</span>
              <select value={filterDateRange} onChange={(e) => setFilterDateRange(e.target.value)} className="form-input btn-sm" style={{ width: "140px", height: "36px", padding: "4px 8px", background: "rgba(255,255,255,0.03)" }}>
                <option value="All">All Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {showAddLeadModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="premium-card" style={{ width: "100%", maxWidth: "500px", padding: "40px" }}>
              <h3 className="serif-display" style={{ fontSize: "1.5rem", marginBottom: "20px" }}>
                Create <span className="editorial-italic">New Lead</span>
              </h3>
              
              <form onSubmit={handleCreateLeadSubmit}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" value={newLeadName} onChange={(e) => setNewLeadName(e.target.value)} className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" value={newLeadEmail} onChange={(e) => setNewLeadEmail(e.target.value)} className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="text" value={newLeadPhone} onChange={(e) => setNewLeadPhone(e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Company / Organization</label>
                  <input type="text" value={newLeadCompany} onChange={(e) => setNewLeadCompany(e.target.value)} className="form-input" placeholder="e.g. Acme Corp" />
                </div>
                <div className="grid-2" style={{ gap: "16px", marginBottom: "16px" }}>
                  <div>
                    <label className="form-label">Lead Source</label>
                    <select value={newLeadSource} onChange={(e) => setNewLeadSource(e.target.value)} className="form-input" style={{ background: "var(--bg-color)" }}>
                      <option value="Website Form">Website Form</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Gmail">Gmail</option>
                      <option value="Cold Call">Cold Call</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Referral">Referral</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Estimated Deal Value ($)</label>
                    <input type="number" value={newLeadValue} onChange={(e) => setNewLeadValue(e.target.value)} className="form-input" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Internal Notes</label>
                  <textarea value={newLeadNotes} onChange={(e) => setNewLeadNotes(e.target.value)} className="form-input" style={{ minHeight: "60px", resize: "vertical" }} />
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                  <button type="submit" className="btn btn-gold" style={{ flexGrow: "1" }}>Create Lead</button>
                  <button type="button" className="btn btn-secondary" onClick={() => {
                    setNewLeadName("");
                    setNewLeadEmail("");
                    setNewLeadPhone("");
                    setNewLeadCompany("");
                    setNewLeadSource("Website Form");
                    setNewLeadNotes("Manually registered inside SaaS dashboard panel.");
                    setNewLeadValue(1200);
                    setShowAddLeadModal(false);
                  }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Lead Info</th>
                <th>Industry Context</th>
                <th>Score</th>
                <th>Projected Value</th>
                <th>Date Added</th>
                <th>Current Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((l) => {
                const score = l.ai_score !== undefined ? l.ai_score : l.score;
                return (
                  <tr key={l.id}>
                    <td>
                      <strong>{l.name}</strong>
                      {l.company && <span style={{ fontSize: "0.8rem", color: "var(--accent-gold)", marginLeft: "6px" }}>({l.company})</span>}
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{l.email} | {l.phone || "No phone"}</div>
                    </td>
                    <td style={{ textTransform: "capitalize" }}>{l.industry}</td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <span className="badge-score">{score}</span>
                        {getAIQualificationBadge(score, l.notes)}
                      </div>
                    </td>
                    <td style={{ fontWeight: "600" }}>${(Number(l.value) || 0).toLocaleString()}</td>
                    <td>{l.date}</td>
                    <td>
                      <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--accent-gold)" }}>{l.status}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => setSelectedLeadId(l.id)}
                          style={{ padding: "4px 8px" }}
                          title="View & Edit Details"
                        >
                          <Eye size={12} />
                        </button>
                        {followupSequences.length > 0 && (
                          <button 
                            className="btn btn-sm"
                            style={{ padding: "4px 8px", background: "rgba(109,201,165,0.15)", border: "1px solid rgba(109,201,165,0.3)", color: "var(--accent-emerald)", fontSize: "0.68rem", fontWeight: "600" }}
                            onClick={() => { setScheduleModalLeadId(l.id); setScheduleModalSeqId(followupSequences[0]?.id || ""); setShowScheduleModal(true); }}
                            title="Schedule a follow-up sequence for this lead"
                          >
                            <Repeat size={10} style={{ marginRight: 3 }} />
                            Sequence
                          </button>
                        )}
                        <button 
                          className="btn btn-danger btn-sm" 
                          onClick={() => removeLead(l.id)}
                          style={{ padding: "4px 8px" }}
                          title="Delete Lead"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 3. LEAD DETAILS DEEP DIVE
  const renderLeadDetails = () => {
    const lead = leads.find(l => l.id === selectedLeadId);
    if (!lead) {
      return (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ color: "var(--text-muted)" }}>No lead selected. Go back to Leads list.</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: "16px" }} onClick={() => setDashboardSection("leads")}>
            Back to Leads
          </button>
        </div>
      );
    }

    const { reasoning, nextAction, original } = parseLeadNotes(lead.notes);

    return (
      <div className="grid-2" style={{ alignItems: "flex-start" }}>
        
        {/* Left Column: Info & Booking */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Left Card: Info & Update status */}
          <div className="premium-card">
            <h3 className="serif-display" style={{ fontSize: "1.75rem", marginBottom: "8px" }}>
              {lead.name}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--accent-gold)", textTransform: "uppercase", fontWeight: "600", marginBottom: "24px" }}>
              {lead.industry} Pipeline
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "32px", fontSize: "0.9rem" }}>
              <div style={{ display: "flex", justifySpace: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                <span style={{ color: "var(--text-muted)" }}>Email Address:</span>
                <strong>{lead.email}</strong>
              </div>
              <div style={{ display: "flex", justifySpace: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                <span style={{ color: "var(--text-muted)" }}>Mobile Number:</span>
                <strong>{lead.phone}</strong>
              </div>
              <div style={{ display: "flex", justifySpace: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                <span style={{ color: "var(--text-muted)" }}>Lead Qualification Score:</span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span className="badge-score" style={{ fontWeight: "700" }}>{lead.score}</span>
                  {getAIQualificationBadge(lead.score, lead.notes)}
                </div>
              </div>
              <div style={{ display: "flex", justifySpace: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                <span style={{ color: "var(--text-muted)" }}>AI Qualification status:</span>
                <strong style={{
                  color: lead.score >= 80 ? "var(--accent-emerald)" : lead.score >= 50 ? "var(--accent-gold)" : hasBeenAIQualified(lead.notes) ? "var(--text-muted)" : "var(--text-muted)"
                }}>
                  {lead.score >= 80 ? "Hot" : lead.score >= 50 ? "Warm" : hasBeenAIQualified(lead.notes) ? "Cold" : "Pending"}
                </strong>
              </div>
              <div style={{ display: "flex", justifySpace: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                <span style={{ color: "var(--text-muted)" }}>Projected Deal Value:</span>
                <strong style={{ color: "var(--accent-emerald)" }}>${lead.value.toLocaleString()} USD</strong>
              </div>
            </div>

            <div className="form-group" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "24px" }}>
              <label className="form-label">Adjust CRM Stage</label>
              <select 
                value={lead.status} 
                onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                className="form-input"
                style={{ background: "var(--bg-color)", border: "1px solid var(--accent-gold)" }}
              >
                <option value="New Lead">New Lead</option>
                <option value="Qualified">Qualified</option>
                <option value="Contacted">Contacted</option>
                <option value="Interested">Interested</option>
                <option value="Appointment Booked">Appointment Booked</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>
            </div>

            <button className="btn btn-secondary btn-sm" style={{ marginTop: "24px" }} onClick={() => setDashboardSection("leads")}>
              <span>Back to Leads list</span>
            </button>
          </div>

          {/* Book Strategy Consultation Card */}
          <div className="premium-card" style={{ border: "1px solid rgba(212,175,55,0.15)" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <Calendar size={18} style={{ color: "var(--accent-gold)" }} />
              <span>Book Strategy Consultation</span>
            </h3>

            {!googleConnected && (
              <div style={{ background: "rgba(214, 178, 74, 0.05)", border: "1px solid rgba(214, 178, 74, 0.2)", padding: "12px", borderRadius: "var(--radius-sm)", marginBottom: "16px", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                <span>⚠️ <strong>Simulation Mode Active</strong>: Google Calendar is not connected. The system will mock Meet links and sync local appointments. </span>
                <span 
                  onClick={() => setDashboardSection("integrations")} 
                  style={{ color: "var(--accent-gold)", textDecoration: "underline", cursor: "pointer", display: "inline-block", marginTop: "4px" }}
                >
                  Connect Google Calendar
                </span>
              </div>
            )}

            <form onSubmit={handleBookMeeting} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: "0.75rem" }}>Meeting Title *</label>
                <input 
                  type="text" 
                  value={bookingTitle} 
                  onChange={(e) => setBookingTitle(e.target.value)} 
                  className="form-input" 
                  required 
                />
              </div>

              <div className="grid-2" style={{ gap: "12px" }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "0.75rem" }}>Start Time *</label>
                  <input 
                    type="datetime-local" 
                    value={bookingStartTime} 
                    onChange={(e) => setBookingStartTime(e.target.value)} 
                    className="form-input" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "0.75rem" }}>End Time *</label>
                  <input 
                    type="datetime-local" 
                    value={bookingEndTime} 
                    onChange={(e) => setBookingEndTime(e.target.value)} 
                    className="form-input" 
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: "0.75rem" }}>Description</label>
                <textarea 
                  value={bookingDescription} 
                  onChange={(e) => setBookingDescription(e.target.value)} 
                  className="form-input" 
                  rows={2} 
                  style={{ resize: "none" }}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-gold" 
                style={{ width: "100%", marginTop: "8px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
                disabled={bookingLoading}
              >
                {bookingLoading ? (
                  <span>Scheduling Event...</span>
                ) : (
                  <>
                    <Calendar size={16} />
                    <span>{googleConnected ? "Book Google Meeting" : "Book Meeting (Simulated)"}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Card: AI Assist followups */}
        <div className="premium-card gold-glow">
          <h3 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
            <Sparkles size={20} style={{ color: "var(--accent-gold)" }} />
            <span>AI Sales Assistant Nurturing</span>
          </h3>

          {hasBeenAIQualified(lead.notes) ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
              <div style={{ background: "rgba(109, 201, 165, 0.04)", border: "1px solid rgba(109, 201, 165, 0.2)", padding: "16px", borderRadius: "var(--radius-sm)" }}>
                <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--accent-emerald)", marginBottom: "6px" }}>
                  💡 AI Evaluation Reasoning
                </strong>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                  {reasoning}
                </p>
              </div>

              <div style={{ background: "rgba(214, 178, 74, 0.04)", border: "1px solid rgba(214, 178, 74, 0.2)", padding: "16px", borderRadius: "var(--radius-sm)" }}>
                <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--accent-gold)", marginBottom: "6px" }}>
                  ⚡ Recommended Next Action
                </strong>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                  {nextAction}
                </p>
              </div>
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", lineHeight: "1.6", marginBottom: "20px" }}>
              Generate automatic qualification follow-ups or script updates based on lead industry criteria.
            </p>
          )}

          <button className="btn btn-gold btn-sm" onClick={() => generateAIFollowUp(lead)} style={{ marginBottom: "24px" }}>
            <span>Generate Customized WhatsApp script</span>
          </button>

          {aiAssistantResult ? (
            <div style={{ background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.3)", padding: "16px", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", lineHeight: "1.5", color: "var(--text-secondary)" }}>
              <strong>AI Auto-Drafted Script:</strong>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "0.8rem", color: "var(--text-primary)", marginTop: "12px", background: "#050505", padding: "12px", border: "1px solid var(--border-color)", borderRadius: "4px" }}>
                {aiAssistantResult}
              </pre>
              <div style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button className="btn btn-emerald btn-sm" style={{ padding: "4px 10px", fontSize: "0.75rem" }} onClick={() => { alert("Simulated direct WhatsApp sent successfully via WhatsApp Business integration!"); setAiAssistantResult(""); }}>
                  Send via WhatsApp
                </button>
              </div>
            </div>
          ) : (
            <div style={{ border: "1px dashed var(--border-color)", padding: "20px", borderRadius: "var(--radius-sm)", textAlignment: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Click button above to simulate LLM followup copywriting templates.
            </div>
          )}

          <div style={{ marginTop: "32px", borderTop: "1px solid var(--border-color)", paddingTop: "24px" }}>
            <h4 style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "12px" }}>
              Internal Prospect Logs
            </h4>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.5", fontStyle: "italic", background: "#080808", padding: "12px", borderRadius: "4px" }}>
              "{original || "None"}"
            </p>
          </div>
        </div>

      </div>
    );
  };

  // 4. CRM PIPELINE KANBAN STAGES
  const renderPipeline = () => {
    const stages = [
      "New Lead", "Contacted", "Qualified", "Appointment Booked", "Closed Won"
    ];

    const filteredLeadsList = getFilteredLeads();

    return (
      <div>
        {/* Search & Filters Engine Bar for Pipeline page */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px", fontSize: "0.85rem" }}>
          <div style={{ flexGrow: "1", minWidth: "200px" }}>
            <input 
              type="text" 
              placeholder="Search by name, email, or company..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input" 
              style={{ height: "36px", padding: "8px 12px" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "var(--text-muted)" }}>AI Rating:</span>
            <select value={filterAIScore} onChange={(e) => setFilterAIScore(e.target.value)} className="form-input btn-sm" style={{ width: "120px", height: "36px", padding: "4px 8px", background: "rgba(255,255,255,0.03)" }}>
              <option value="All">All Ratings</option>
              <option value="Hot">🔥 Hot (&gt;=80)</option>
              <option value="Warm">⚡ Warm (50-79)</option>
              <option value="Cold">❄️ Cold (&lt;50)</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "var(--text-muted)" }}>Date Range:</span>
            <select value={filterDateRange} onChange={(e) => setFilterDateRange(e.target.value)} className="form-input btn-sm" style={{ width: "120px", height: "36px", padding: "4px 8px", background: "rgba(255,255,255,0.03)" }}>
              <option value="All">All Time</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>

        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "24px" }}>
          💡 Drag & drop leads between stages to update their statuses. Click a card to open details drawer.
        </p>
        <div className="kanban-board">
          {stages.map((stage) => {
            const stageLeads = filteredLeadsList.filter(l => l.status === stage);
            const isDraggedOver = draggedOverStage === stage;
            return (
              <div 
                key={stage} 
                className="kanban-column"
                onDragOver={(e) => !isSwitchingWorkspace && handleDragOver(e)}
                onDragEnter={(e) => !isSwitchingWorkspace && handleDragEnter(e, stage)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => !isSwitchingWorkspace && handleDrop(e, stage)}
                style={{
                  transition: "var(--transition-fast)",
                  border: isDraggedOver ? "1px solid var(--accent-gold)" : "1px solid var(--border-color)",
                  boxShadow: isDraggedOver ? "0 0 15px rgba(214, 178, 74, 0.25)" : "none",
                  background: isDraggedOver ? "rgba(214, 178, 74, 0.02)" : "rgba(255, 255, 255, 0.03)"
                }}
              >
                <div className="kanban-header">
                  <span className="kanban-col-name">{stage}</span>
                  <span className="kanban-col-count">{stageLeads.length}</span>
                </div>

                <div className="kanban-cards" style={{ minHeight: "450px" }}>
                  {stageLeads.map((lead) => {
                    const score = lead.ai_score !== undefined ? lead.ai_score : lead.score;
                    return (
                      <div 
                        key={lead.id} 
                        className="kanban-card"
                        draggable={!isSwitchingWorkspace}
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onClick={() => setSelectedLeadId(lead.id)}
                        style={{ cursor: isSwitchingWorkspace ? "not-allowed" : "grab" }}
                      >
                        <div className="kanban-card-title">{lead.name}</div>
                        {lead.company && <div style={{ fontSize: "0.75rem", color: "var(--accent-gold)", marginBottom: "4px" }}>{lead.company}</div>}
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{lead.email}</div>
                        
                        <div className="kanban-card-meta">
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <span className="badge-score">{score}</span>
                            {getAIQualificationBadge(score, lead.notes)}
                          </div>
                          <strong style={{ color: "var(--accent-emerald)" }}>${(Number(lead.value) || 0).toLocaleString()}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 5. AI ASSISTANT CHAT
  const renderAIAssistant = () => {
    const handleSendMsg = (e) => {
      e.preventDefault();
      if (!userMsg) return;

      const updatedMsgs = [...messages, { bot: false, text: userMsg }];
      setMessages(updatedMsgs);
      setUserMsg("");

      setTimeout(() => {
        let reply = "I've scanned your request. To optimize conversion, connect our WordPress plugin and WhatsApp node simultaneously via the stand-alone Integrations page. Growth active tier accounts achieve 92%+ score efficiency.";
        if (userMsg.toLowerCase().includes("email")) {
          reply = "AI Copywriting response: Subject: Schedule Your Assessment Today // Hi there! Let's lock in your fitness assessment this Monday at Elevate Center. Reply with your time preference.";
        }
        setMessages(prev => [...prev, { bot: true, text: reply }]);
      }, 1000);
    };

    return (
      <div className="grid-2" style={{ alignItems: "stretch" }}>
        
        {/* Left Side: Active chat */}
        <div className="premium-card" style={{ display: "flex", flexDirection: "column", height: "500px" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "16px" }}>B2B Prompt sandbox</h3>
          <div style={{ flexGrow: "1", overflowY: "auto", background: "#050505", border: "1px solid var(--border-color)", padding: "16px", borderRadius: "4px", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{ 
                alignSelf: m.bot ? "flex-start" : "flex-end",
                background: m.bot ? "var(--surface-hover)" : "var(--accent-emerald)",
                color: "#F5F5F5",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "0.85rem",
                maxWidth: "85%",
                lineHeight: "1.4"
              }}>
                {m.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMsg} style={{ display: "flex", gap: "8px" }}>
            <input 
              type="text" 
              placeholder="e.g. Write a gym trial followup email template" 
              value={userMsg} 
              onChange={(e) => setUserMsg(e.target.value)}
              className="form-input" 
              style={{ flexGrow: "1" }}
            />
            <button type="submit" className="btn btn-gold btn-sm">Send</button>
          </form>
        </div>

        {/* Right Side: CRM logs audit */}
        <div className="premium-card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "16px", color: "var(--accent-gold)" }}>AI Capability Modules</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            <div style={{ background: "var(--surface-color)", border: "1px solid var(--border-color)", padding: "16px", borderRadius: "4px" }}>
              <strong>✓ Lead Urgency Scoring</strong>
              <p style={{ fontSize: "0.75rem", marginTop: "4px" }}>Auto-evaluates incoming inquiry text lengths and intent keyword frequencies (budget, location) automatically.</p>
            </div>
            <div style={{ background: "var(--surface-color)", border: "1px solid var(--border-color)", padding: "16px", borderRadius: "4px" }}>
              <strong>✓ WhatsApp Template screening</strong>
              <p style={{ fontSize: "0.75rem", marginTop: "4px" }}>Pre-scans templates to ensure high meta validation success before launching live messaging sequences.</p>
            </div>
            <div style={{ background: "var(--surface-color)", border: "1px solid var(--border-color)", padding: "16px", borderRadius: "4px" }}>
              <strong>✓ Billing reconciliation hooks</strong>
              <p style={{ fontSize: "0.75rem", marginTop: "4px" }}>Connects to Razorpay payments to trigger automated follow-up invoice delivery drafts.</p>
            </div>
          </div>
        </div>

      </div>
    );
  };

  // 6. AUTOMATION DIAGRAM BUILDER
  const renderAutomations = () => {
    return (
      <div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "32px" }}>
          Orchestrate pre-built logical growth flows. Toggling nodes adjusts live capture rules automatically.
        </p>

        <div className="grid-2">
          {workflows.map((w) => (
            <div key={w.id} className="premium-card" style={{ display: "flex", flexDirection: "column", justifySpace: "space-between" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: "600", color: "#F5F5F5" }}>{w.name}</h4>
                  <label className="switch" style={{ position: "relative", display: "inline-block", width: "36px", height: "20px" }}>
                    <input 
                      type="checkbox" 
                      checked={w.active} 
                      onChange={() => toggleWorkflow(w.id)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{ 
                      position: "absolute", 
                      cursor: "pointer", 
                      top: 0, left: 0, right: 0, bottom: 0, 
                      backgroundColor: w.active ? "var(--accent-emerald)" : "#444",
                      transition: "0.4s",
                      borderRadius: "20px"
                    }}>
                      <span style={{ 
                        position: "absolute", 
                        content: "''", 
                        height: "14px", width: "14px", 
                        left: w.active ? "18px" : "3px", bottom: "3px", 
                        backgroundColor: "#0A0A0A", 
                        transition: "0.4s",
                        borderRadius: "50%" 
                      }}></span>
                    </span>
                  </label>
                </div>
                
                {/* Node triggers lists */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "16px 0" }}>
                  {w.triggers.map((t, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span style={{ color: "var(--accent-gold)" }}>➔</span>}
                      <span style={{ fontSize: "0.7rem", padding: "4px 8px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "4px", color: "var(--text-secondary)" }}>
                        {t}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: "0.75rem", color: w.active ? "var(--accent-emerald)" : "var(--text-muted)", fontWeight: "600", marginTop: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                Status: {w.active ? "Active & Syncing" : "Paused"}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 7. ANALYTICS CENTER
  const renderAnalytics = () => {
    const closedWonCount = leads.filter(l => l.status === "Closed Won").length;
    const conversionRate = leads.length > 0 ? Math.round((closedWonCount / leads.length) * 100) : 0;

    // AI Funnel Calculations
    const captured = leads.length;
    const qualified = leads.filter(l => l.status === "Qualified" || l.status === "Appointment Booked" || l.status === "Closed Won" || (Number(l.score) >= 50)).length;
    const booked = leads.filter(l => l.status === "Appointment Booked" || l.status === "Closed Won").length;
    const won = closedWonCount;

    const pctQualified = captured > 0 ? Math.round((qualified / captured) * 100) : 0;
    const pctBooked = captured > 0 ? Math.round((booked / captured) * 100) : 0;
    const pctWon = captured > 0 ? Math.round((won / captured) * 100) : 0;

    // Lead Priority Calculations
    const hotCount = leads.filter(l => l.priority === "Hot" || (Number(l.score) >= 80)).length;
    const warmCount = leads.filter(l => l.priority === "Warm" || (Number(l.score) >= 50 && Number(l.score) < 80)).length;
    const coldCount = leads.filter(l => (!l.priority || l.priority === "Cold") && (Number(l.score) < 50 || !l.score)).length;
    const totalPriorityCount = hotCount + warmCount + coldCount || 1;

    const pctHot = Math.round((hotCount / totalPriorityCount) * 100);
    const pctWarm = Math.round((warmCount / totalPriorityCount) * 100);
    const pctCold = Math.round((coldCount / totalPriorityCount) * 100);

    // Follow-up calculations
    const fGenerated = followups.length;
    const fSent = followups.filter(f => f.status === "sent" || f.status === "completed").length;
    const fCompleted = followups.filter(f => f.status === "completed").length;

    const pctSent = fGenerated > 0 ? Math.round((fSent / fGenerated) * 100) : 0;
    const pctCompleted = fGenerated > 0 ? Math.round((fCompleted / fGenerated) * 100) : 0;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Analytics Tab Switcher */}
        <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
          <button 
            className={`btn btn-sm ${analyticsTab === "overview" ? "btn-gold" : "btn-secondary"}`}
            onClick={() => setAnalyticsTab("overview")}
          >
            Growth Overview
          </button>
          <button 
            className={`btn btn-sm ${analyticsTab === "team" ? "btn-gold" : "btn-secondary"}`}
            onClick={() => setAnalyticsTab("team")}
          >
            Team Performance
          </button>
        </div>

        {analyticsTab === "overview" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            
            {/* KPI Row */}
            <div className="grid-2" style={{ alignItems: "stretch" }}>
              <div className="chart-container">
                <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "20px" }}>Captured vs Qualified Leads (Weekly)</h3>
                <WeeklyConversionBarChart leads={leads} />
              </div>
              <div className="premium-card">
                <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "16px", color: "var(--accent-gold)" }}>Growth Metrics Overview</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
                    <span>Average qualification time:</span>
                    <strong>45 seconds</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
                    <span>CAC (Customer Acquisition Cost):</span>
                    <strong>$32.50 USD</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
                    <span>Pipeline Conversion rate:</span>
                    <strong style={{ color: "var(--accent-emerald)" }}>{conversionRate}%</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
                    <span>Appointments Booked count:</span>
                    <strong>{appointments.length} Total</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 5 Metrics Grid */}
            <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
              
              {/* Funnel Widget */}
              <div className="premium-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)" }}>AI Conversion Funnel</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "4px" }}>
                      <span>1. Captured Leads</span>
                      <strong>{captured} ({captured > 0 ? "100" : "0"}%)</strong>
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: captured > 0 ? "100%" : "0%", height: "100%", background: "var(--accent-gold)" }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "4px" }}>
                      <span>2. AI Qualified (Score &ge; 50)</span>
                      <strong>{qualified} ({pctQualified}%)</strong>
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: `${pctQualified}%`, height: "100%", background: "var(--accent-gold)" }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "4px" }}>
                      <span>3. Meeting Booked</span>
                      <strong>{booked} ({pctBooked}%)</strong>
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: `${pctBooked}%`, height: "100%", background: "var(--accent-gold)" }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "4px" }}>
                      <span>4. Closed Won Deals</span>
                      <strong>{won} ({pctWon}%)</strong>
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ width: `${pctWon}%`, height: "100%", background: "var(--accent-emerald)", boxShadow: "0 0 10px var(--accent-emerald-glow)" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Lead Priority Distribution Widget */}
              <div className="premium-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)" }}>Lead Priority Distribution</h3>
                
                {/* Segmented bar */}
                <div style={{ display: "flex", height: "16px", borderRadius: "8px", overflow: "hidden", background: "rgba(255,255,255,0.05)", width: "100%" }}>
                  {hotCount > 0 && <div style={{ width: `${pctHot}%`, background: "var(--accent-emerald)" }} title={`Hot: ${pctHot}%`} />}
                  {warmCount > 0 && <div style={{ width: `${pctWarm}%`, background: "var(--accent-gold)" }} title={`Warm: ${pctWarm}%`} />}
                  {coldCount > 0 && <div style={{ width: `${pctCold}%`, background: "#444" }} title={`Cold: ${pctCold}%`} />}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.8rem", marginTop: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-emerald)" }} />
                      <span>🔥 Hot leads (Score &ge; 80)</span>
                    </div>
                    <strong>{hotCount} ({pctHot}%)</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-gold)" }} />
                      <span>⚡ Warm leads (Score 50-79)</span>
                    </div>
                    <strong>{warmCount} ({pctWarm}%)</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#444" }} />
                      <span>❄️ Cold leads (Score &lt; 50)</span>
                    </div>
                    <strong>{coldCount} ({pctCold}%)</strong>
                  </div>
                </div>
              </div>

              {/* Follow-up Performance Widget */}
              <div className="premium-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)" }}>Follow-Up Performance</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "4px" }}>
                        <span>Generated follow-ups</span>
                        <strong>{fGenerated}</strong>
                      </div>
                      <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px" }}>
                        <div style={{ width: fGenerated > 0 ? "100%" : "0%", height: "100%", background: "var(--accent-gold)" }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "4px" }}>
                        <span>Sent / Initiated follow-ups</span>
                        <strong>{fSent} ({pctSent}%)</strong>
                      </div>
                      <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px" }}>
                        <div style={{ width: `${pctSent}%`, height: "100%", background: "var(--accent-gold)" }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "4px" }}>
                        <span>Completed / Scheduled deals</span>
                        <strong>{fCompleted} ({pctCompleted}%)</strong>
                      </div>
                      <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.05)", borderRadius: "3px" }}>
                        <div style={{ width: `${pctCompleted}%`, height: "100%", background: "var(--accent-emerald)", boxShadow: "0 0 10px var(--accent-emerald-glow)" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Revenue Forecasting Upgrades */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "32px", marginBottom: "32px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "20px", color: "var(--accent-gold)", display: "flex", alignItems: "center", gap: "8px" }}>
                <Brain size={18} />
                <span>AI Revenue Forecasting & Projection</span>
              </h3>
              
              <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                <div className="premium-card gold-glow" style={{ padding: "20px" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Forecast Revenue</span>
                  <strong style={{ fontSize: "2rem", display: "block", marginTop: "8px", color: "var(--accent-gold)" }}>
                    ${Math.round(leads
                      .filter(l => !["Closed Lost", "Closed Won"].includes(l.status))
                      .reduce((acc, l) => acc + ((Number(l.value) || 0) * ((Number(l.score) || 0) / 100)), 0)
                    ).toLocaleString()}
                  </strong>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
                    Weighted by AI Closing Probability
                  </span>
                </div>

                <div className="premium-card" style={{ padding: "20px" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Closing Probability</span>
                  <strong style={{ fontSize: "2rem", display: "block", marginTop: "8px" }}>
                    {leads.filter(l => !["Closed Lost", "Closed Won"].includes(l.status)).length > 0
                      ? Math.round(leads.filter(l => !["Closed Lost", "Closed Won"].includes(l.status)).reduce((acc, l) => acc + (Number(l.score) || 0), 0) / leads.filter(l => !["Closed Lost", "Closed Won"].includes(l.status)).length)
                      : 0}%
                  </strong>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
                    Average CRM AI score
                  </span>
                </div>

                <div className="premium-card" style={{ padding: "20px" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Monthly Projection</span>
                  <strong style={{ fontSize: "2rem", display: "block", marginTop: "8px", color: "var(--accent-emerald)" }}>
                    ${Math.round(
                      leads.filter(l => !["Closed Lost", "Closed Won"].includes(l.status)).reduce((acc, l) => acc + ((Number(l.value) || 0) * ((Number(l.score) || 0) / 100)), 0) +
                      leads.filter(l => l.status === "Closed Won").reduce((acc, l) => acc + (Number(l.value) || 0), 0)
                    ).toLocaleString()}
                  </strong>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
                    Forecast + Closed Won Revenue
                  </span>
                </div>

                <div className="premium-card" style={{ padding: "20px" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Agent Performance</span>
                  <strong style={{ fontSize: "2rem", display: "block", marginTop: "8px" }}>
                    {agentTasks.length > 0
                      ? Math.round((agentTasks.filter(t => t.status === "completed").length / agentTasks.length) * 100)
                      : 100}%
                  </strong>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
                    {agentTasks.filter(t => t.status === "completed").length} / {agentTasks.length} Automated tasks
                  </span>
                </div>
              </div>
            </div>

            {/* Outreach Performance Upgrades */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "32px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "20px", color: "var(--accent-gold)" }}>Outreach Performance</h3>
              
              <div className="grid-5" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "32px" }}>
                <div className="premium-card" style={{ padding: "20px" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Email Sent</span>
                  <strong style={{ fontSize: "1.8rem", display: "block", marginTop: "8px" }}>
                    {campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0)}
                  </strong>
                </div>
                <div className="premium-card" style={{ padding: "20px" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Email Opened</span>
                  <strong style={{ fontSize: "1.8rem", display: "block", marginTop: "8px", color: "var(--accent-gold)" }}>
                    {campaigns.reduce((acc, c) => acc + (c.open_count || 0), 0)}
                  </strong>
                </div>
                <div className="premium-card" style={{ padding: "20px" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Replies</span>
                  <strong style={{ fontSize: "1.8rem", display: "block", marginTop: "8px", color: "var(--accent-emerald)" }}>
                    {campaigns.reduce((acc, c) => acc + (c.reply_count || 0), 0)}
                  </strong>
                </div>
                <div className="premium-card" style={{ padding: "20px" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Appointments Booked</span>
                  <strong style={{ fontSize: "1.8rem", display: "block", marginTop: "8px" }}>
                    {campaigns.reduce((acc, c) => acc + (c.appointment_count || 0), 0)}
                  </strong>
                </div>
                <div className="premium-card" style={{ padding: "20px" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Revenue Influenced</span>
                  <strong style={{ fontSize: "1.8rem", display: "block", marginTop: "8px", color: "var(--accent-emerald)" }}>
                    ${leads
                      .filter(l => l.status === "Closed Won" && campaignRecipients.some(cr => cr.lead_id === l.id))
                      .reduce((acc, curr) => acc + (Number(curr.value) || 0), 0)
                      .toLocaleString()}
                  </strong>
                </div>
              </div>

              {/* Campaign Leaderboard */}
              <div className="grid-2">
                <div className="premium-card">
                  <h4 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "16px", color: "var(--accent-gold)" }}>Top Performing Campaigns</h4>
                  {campaigns.length === 0 ? (
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>No campaign data available.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {[...campaigns]
                        .sort((a, b) => (b.appointment_count || 0) - (a.appointment_count || 0))
                        .slice(0, 3)
                        .map((c, idx) => {
                          const cOpenRate = c.sent_count > 0 ? Math.round((c.open_count / c.sent_count) * 100) : 0;
                          return (
                            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
                              <div>
                                <strong style={{ fontSize: "0.85rem" }}>{idx + 1}. {c.name}</strong>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>{c.sent_count || 0} Emails • {cOpenRate}% Opens</span>
                              </div>
                              <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--accent-emerald)" }}>{c.appointment_count || 0} Bookings</span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                <div className="premium-card">
                  <h4 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "16px" }}>Highest Converting Leads</h4>
                  {leads.filter(l => campaignRecipients.some(cr => cr.lead_id === l.id)).length === 0 ? (
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>No converting leads yet.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {leads
                        .filter(l => campaignRecipients.some(cr => cr.lead_id === l.id))
                        .sort((a, b) => (b.score || 0) - (a.score || 0))
                        .slice(0, 3)
                        .map((l) => (
                          <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
                            <div>
                              <strong style={{ fontSize: "0.85rem" }}>{l.name}</strong>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>{l.company || "Company"} • {l.status}</span>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--accent-gold)", display: "block" }}>Score: {l.score || 0}</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>${(l.value || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Phase 8: Deal & Revenue Analytics Upgrades */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "32px", marginTop: "16px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "600", marginBottom: "20px", color: "var(--accent-gold)", display: "flex", alignItems: "center", gap: "8px" }}>
                <BarChart2 size={18} />
                <span>Executive Revenue & Deal Intelligence Analytics</span>
              </h3>
              
              <div className="grid-2" style={{ marginBottom: "24px" }}>
                <div className="chart-container">
                  <h4 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "16px" }}>Pipeline Growth Trend</h4>
                  <RevenuePipelineChart leads={leads} />
                </div>
                <div className="chart-container">
                  <h4 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "16px" }}>Revenue Forecast Trend</h4>
                  <RevenueForecastTrendChart forecasts={forecasts} />
                </div>
              </div>

              <div className="grid-2">
                <div className="chart-container">
                  <h4 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "16px" }}>Deal Stage Distribution</h4>
                  <DealStageDistributionChart deals={deals} />
                </div>
                <div className="chart-container">
                  <h4 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "16px" }}>Win / Loss Ratio Analysis</h4>
                  <WinLossRatioChart deals={deals} />
                </div>
              </div>
            </div>

          </div>
        ) : (
          (() => {
            const sorted = [...teamPerformance].sort((a, b) => (b.teamScore || 0) - (a.teamScore || 0));
            const bestPerformer = sorted[0] || null;
            const needsAttention = sorted.length > 1 ? sorted[sorted.length - 1] : null;
            const highestPipeline = [...teamPerformance].sort((a, b) => b.pipelineValue - a.pipelineValue)[0] || null;
            const mostImproved = teamPerformance.length > 1
              ? [...teamPerformance].sort((a, b) => (b.appointmentsCount - b.wonCount) - (a.appointmentsCount - a.wonCount))[0]
              : teamPerformance[0] || null;

            const lbSorted = [...teamPerformance].sort((a, b) => {
              const av = a[leaderboardSort.col] ?? 0;
              const bv = b[leaderboardSort.col] ?? 0;
              return leaderboardSort.dir === "desc" ? bv - av : av - bv;
            });

            const handleLbSort = (col) => {
              setLeaderboardSort(prev => prev.col === col ? { col, dir: prev.dir === "desc" ? "asc" : "desc" } : { col, dir: "desc" });
            };
            const sortIcon = (col) => leaderboardSort.col === col ? (leaderboardSort.dir === "desc" ? " \u2193" : " \u2191") : "";

            const handleExportCSV = () => {
              if (!hasPermission(organizationRole, PERMISSIONS.VIEW_TEAM)) return;
              const headers = ["Name","Email","Role","Team Score","Leads","Won Deals","Won Revenue","Pipeline","Win Rate","Appointments"];
              const rows = lbSorted.map(m => [m.name, m.email, m.role, m.teamScore ?? 0, m.leadsCount, m.wonCount, m.wonRevenue, m.pipelineValue, `${m.winRate ?? 0}%`, m.appointmentsCount]);
              const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url;
              a.download = `${currentOrganization?.name || "team"}_performance_${new Date().toISOString().split("T")[0]}.csv`;
              a.click(); URL.revokeObjectURL(url);
            };

            const coachingInsights = teamPerformance.map(m => {
              const avgWinRate = teamPerformance.reduce((s, x) => s + (x.winRate || 0), 0) / (teamPerformance.length || 1);
              const avgAppointments = teamPerformance.reduce((s, x) => s + x.appointmentsCount, 0) / (teamPerformance.length || 1);
              const avgPipeline = teamPerformance.reduce((s, x) => s + x.pipelineValue, 0) / (teamPerformance.length || 1);
              let level = "good", border = "var(--accent-emerald)", insight = "", action = "";
              if ((m.teamScore || 0) >= 75) {
                level = "top"; border = "var(--accent-gold)";
                insight = `\uD83C\uDFC6 Top performer with a composite score of ${m.teamScore}. Win rate at ${m.winRate}%.`;
                action = "Continue mentoring others and share prospecting strategies with the team.";
              } else if (m.appointmentsCount > avgAppointments * 1.5 && m.winRate < avgWinRate * 0.6) {
                level = "warning"; border = "#f59e0b";
                insight = `\u26A1 High activity (${m.appointmentsCount} appts) but low conversion at ${m.winRate}% win rate.`;
                action = "Review qualification criteria and closing process. Consider shadowing a top closer.";
              } else if (m.pipelineValue > avgPipeline * 1.3 && m.winRate < 20) {
                level = "warning"; border = "#f59e0b";
                insight = `\uD83D\uDCB0 Strong pipeline ($${m.pipelineValue.toLocaleString()}) but only ${m.winRate}% win rate.`;
                action = "Focus on closing: identify top 3 deals and create tailored closing strategies.";
              } else if (m.leadsCount < 3 && m.winRate >= 50) {
                level = "good"; border = "var(--accent-emerald)";
                insight = `\uD83D\uDCC8 Closing well at ${m.winRate}% win rate but low lead volume (${m.leadsCount} leads).`;
                action = "Scale prospecting: double outreach volume to match conversion quality.";
              } else if ((m.teamScore || 0) < 20) {
                level = "attention"; border = "#f87171";
                insight = `\u26A0\uFE0F Performance metrics below team average (score: ${m.teamScore}). Needs immediate support.`;
                action = "Schedule 1:1 coaching session. Review pipeline, prospecting, and closing skills.";
              } else {
                insight = `\uD83D\uDCCA Performing steadily with ${m.leadsCount} leads, ${m.wonCount} wins, $${m.wonRevenue.toLocaleString()} revenue.`;
                action = "Focus on 1 specific metric to improve: either increase lead volume or improve win rate.";
              }
              return { ...m, level, border, insight, action };
            });

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

                {/* SPOTLIGHT KPI ROW */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                  {[
                    { icon: "🏆", label: "Best Performer", member: bestPerformer, color: "var(--accent-gold)", sub: bestPerformer ? `Score: ${bestPerformer.teamScore}` : "No data" },
                    { icon: "📈", label: "Most Improved", member: teamPerformance.length < 2 ? { name: "Not enough data" } : mostImproved, color: "var(--accent-emerald)", sub: teamPerformance.length < 2 ? "" : (mostImproved ? `${mostImproved.appointmentsCount} appointments` : "No data") },
                    { icon: "💰", label: "Highest Pipeline", member: highestPipeline, color: "#a78bfa", sub: highestPipeline ? `$${highestPipeline.pipelineValue.toLocaleString()}` : "No data" },
                    { icon: "⚠️", label: "Needs Attention", member: needsAttention ? needsAttention : { name: "No rep currently requires intervention" }, color: "#f87171", sub: needsAttention ? `Score: ${needsAttention.teamScore}` : "" },
                  ].map(({ icon, label, member, color, sub }) => (
                    <div key={label} className="premium-card" style={{ borderLeft: `3px solid ${color}` }}>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px", fontWeight: "600" }}>{icon} {label}</div>
                      <div style={{ fontSize: "1rem", fontWeight: "700", color: "#fff" }}>{member?.name || "—"}</div>
                      <div style={{ fontSize: "0.72rem", color, fontWeight: "600", marginTop: "2px" }}>{sub}</div>
                      {member && member.role && <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>{member.role}</div>}
                    </div>
                  ))}
                </div>

                {/* SUB-TAB SWITCHER */}
                <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", flexWrap: "wrap" }}>
                  {[{ key: "overview", label: "Team Overview" }, { key: "leaderboard", label: "Leaderboard" }, { key: "pipeline", label: "Pipeline by Rep" }, { key: "coaching", label: "AI Coaching" }].map(tab => (
                    <button key={tab.key} className={`btn btn-sm ${analyticsTeamTab === tab.key ? "btn-gold" : "btn-secondary"}`} onClick={() => setAnalyticsTeamTab(tab.key)}>{tab.label}</button>
                  ))}
                </div>

                {/* TAB: OVERVIEW */}
                {analyticsTeamTab === "overview" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div className="grid-2">
                      <div className="chart-container">
                        <h4 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "16px" }}>Team Win Rate by Rep</h4>
                        <TeamWinRateChart teamPerformance={teamPerformance} />
                      </div>
                      <div className="chart-container">
                        <h4 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "16px" }}>Pipeline by Rep (5 Months)</h4>
                        <TeamForecastChart teamPerformance={teamPerformance} deals={deals} />
                      </div>
                    </div>
                    <div className="premium-card">
                      <h4 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "6px", color: "var(--accent-gold)" }}>Organization Activity Heatmap</h4>
                      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "16px" }}>All leads, deals, and appointments created across the workspace over the last 8 weeks.</p>
                      <ActivityHeatmapChart leads={leads} deals={deals} appointments={appointments} weeksBack={8} />
                    </div>
                    <div className="premium-card">
                      <h4 style={{ fontSize: "0.95rem", fontWeight: "600", marginBottom: "16px" }}>Revenue Leaderboard</h4>
                      <RepLeaderboardChart teamPerformance={teamPerformance} />
                    </div>
                  </div>
                )}

                {/* TAB: LEADERBOARD */}
                {analyticsTeamTab === "leaderboard" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {bestPerformer && (
                      <div className="premium-card" style={{ background: "linear-gradient(135deg, rgba(214,178,74,0.08) 0%, rgba(214,178,74,0.02) 100%)", border: "1px solid rgba(214,178,74,0.25)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                          <div style={{ fontSize: "2.5rem" }}>👑</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "0.68rem", color: "var(--accent-gold)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: "700" }}>Top Performer This Period</div>
                            <div style={{ fontSize: "1.3rem", fontWeight: "800", color: "#fff", marginTop: "2px" }}>{bestPerformer.name}</div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{bestPerformer.role} • Score {bestPerformer.teamScore} • ${bestPerformer.wonRevenue.toLocaleString()} won • {bestPerformer.winRate}% win rate</div>
                          </div>
                          {hasPermission(organizationRole, PERMISSIONS.VIEW_TEAM) && (
                            <button className="btn btn-secondary btn-sm" onClick={handleExportCSV} style={{ display: "flex", alignItems: "center", gap: "6px" }} title="Export team performance as CSV">
                              <Download size={14} /> Export CSV
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="premium-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                        <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--accent-gold)" }}>Team Leaderboard <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "400" }}>— click columns to sort</span></h3>
                        {!bestPerformer && hasPermission(organizationRole, PERMISSIONS.VIEW_TEAM) && (
                          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV} style={{ display: "flex", alignItems: "center", gap: "6px" }}><Download size={14} />Export CSV</button>
                        )}
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)", fontSize: "0.72rem" }}>
                              <th style={{ padding: "10px 8px" }}>Rank</th>
                              {[["name","Rep"],["role","Role"],["leadsCount","Leads"],["wonCount","Won"],["wonRevenue","Revenue"],["pipelineValue","Pipeline"],["winRate","Win Rate"],["appointmentsCount","Appts"],["teamScore","Score"]].map(([col, label]) => (
                                <th key={col} style={{ padding: "10px 8px", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }} onClick={() => handleLbSort(col)}>{label}{sortIcon(col)}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {lbSorted.map((m, idx) => (
                              <tr key={m.id} style={{ borderBottom: "1px solid var(--border-color)", background: idx === 0 && leaderboardSort.col === "teamScore" ? "rgba(214,178,74,0.04)" : "transparent" }}>
                                <td style={{ padding: "12px 8px", fontWeight: "700", color: idx === 0 ? "var(--accent-gold)" : "var(--text-muted)", fontSize: "0.9rem" }}>{idx === 0 ? "👑" : `#${idx + 1}`}</td>
                                <td style={{ padding: "12px 8px" }}><div style={{ fontWeight: "600" }}>{m.name}</div><div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{m.email}</div></td>
                                <td style={{ padding: "12px 8px" }}><span style={{ padding: "2px 8px", borderRadius: "999px", background: "rgba(255,255,255,0.05)", fontSize: "0.7rem" }}>{m.role}</span></td>
                                <td style={{ padding: "12px 8px" }}>{m.leadsCount}</td>
                                <td style={{ padding: "12px 8px" }}>{m.wonCount}</td>
                                <td style={{ padding: "12px 8px", color: "var(--accent-emerald)", fontWeight: "600" }}>${m.wonRevenue.toLocaleString()}</td>
                                <td style={{ padding: "12px 8px", color: "var(--accent-gold)" }}>${m.pipelineValue.toLocaleString()}</td>
                                <td style={{ padding: "12px 8px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span>{m.winRate ?? 0}%</span>
                                    <div style={{ width: "48px", height: "5px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
                                      <div style={{ width: `${Math.min(m.winRate ?? 0, 100)}%`, height: "100%", background: (m.winRate ?? 0) >= 50 ? "var(--accent-emerald)" : "var(--accent-gold)" }} />
                                    </div>
                                  </div>
                                </td>
                                <td style={{ padding: "12px 8px" }}>{m.appointmentsCount}</td>
                                <td style={{ padding: "12px 8px" }}><span style={{ fontWeight: "700", color: (m.teamScore ?? 0) >= 60 ? "var(--accent-gold)" : "var(--text-primary)" }}>{m.teamScore ?? 0}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="premium-card">
                      <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--accent-gold)", marginBottom: "16px" }}>Manager Scorecard</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px" }}>
                        {[
                          { label: "Total Team Leads", value: teamPerformance.reduce((s, m) => s + m.leadsCount, 0), color: "#fff" },
                          { label: "Total Won Revenue", value: `$${teamPerformance.reduce((s, m) => s + m.wonRevenue, 0).toLocaleString()}`, color: "var(--accent-emerald)" },
                          { label: "Total Pipeline", value: `$${teamPerformance.reduce((s, m) => s + m.pipelineValue, 0).toLocaleString()}`, color: "var(--accent-gold)" },
                          { label: "Avg Team Score", value: teamPerformance.length > 0 ? Math.round(teamPerformance.reduce((s, m) => s + (m.teamScore || 0), 0) / teamPerformance.length) : 0, color: "#fff" },
                          { label: "Avg Win Rate", value: `${teamPerformance.length > 0 ? Math.round(teamPerformance.reduce((s, m) => s + (m.winRate || 0), 0) / teamPerformance.length) : 0}%`, color: "var(--accent-emerald)" },
                          { label: "Total Appointments", value: teamPerformance.reduce((s, m) => s + m.appointmentsCount, 0), color: "#fff" },
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{ padding: "14px 16px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>{label}</div>
                            <div style={{ fontSize: "1.4rem", fontWeight: "700", color }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: PIPELINE BY REP */}
                {analyticsTeamTab === "pipeline" && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px" }}>
                    {teamPerformance.length === 0 && <div style={{ gridColumn: "1 / -1", padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>No team members with data yet.</div>}
                    {teamPerformance.map((m, idx) => {
                      const repColors = ["var(--accent-gold)", "var(--accent-emerald)", "#a78bfa", "#f472b6", "#60a5fa", "#fb923c"];
                      const color = repColors[idx % repColors.length];
                      const initials = m.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                      const totalValue = m.wonRevenue + m.pipelineValue;
                      const wonPct = totalValue > 0 ? Math.round((m.wonRevenue / totalValue) * 100) : 0;
                      return (
                        <div key={m.id} className="premium-card" style={{ borderTop: `3px solid ${color}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: `${color}22`, border: `2px solid ${color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", color, fontSize: "0.9rem", flexShrink: 0 }}>{initials}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: "700", fontSize: "0.95rem" }}>{m.name}</div>
                              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{m.role}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: "0.75rem", fontWeight: "700", color }}>{m.teamScore ?? 0}</div>
                              <div style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>Score</div>
                            </div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
                            {[{ label: "Leads", value: m.leadsCount, c: "#fff" }, { label: "Won", value: m.wonCount, c: "var(--accent-emerald)" }, { label: "Appts", value: m.appointmentsCount, c: color }].map(({ label, value, c }) => (
                              <div key={label} style={{ textAlign: "center", padding: "8px", background: "rgba(255,255,255,0.02)", borderRadius: "6px" }}>
                                <div style={{ fontSize: "1.1rem", fontWeight: "700", color: c }}>{value}</div>
                                <div style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>{label}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ marginBottom: "14px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", marginBottom: "5px" }}>
                              <span style={{ color: "var(--text-muted)" }}>Won vs Pipeline</span>
                              <span style={{ color }}>{wonPct}% closed</span>
                            </div>
                            <div style={{ width: "100%", height: "10px", background: "rgba(255,255,255,0.04)", borderRadius: "5px", overflow: "hidden", display: "flex" }}>
                              <div style={{ width: `${wonPct}%`, background: "var(--accent-emerald)", height: "100%", minWidth: wonPct > 0 ? "4px" : "0" }} />
                              <div style={{ width: `${100 - wonPct}%`, background: `${color}44`, height: "100%" }} />
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "4px" }}>
                              <span>${m.wonRevenue.toLocaleString()} won</span>
                              <span>${m.pipelineValue.toLocaleString()} active</span>
                            </div>
                          </div>
                          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "8px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>Activity (4 weeks)</div>
                            <ActivityHeatmapChart leads={leads} deals={deals} appointments={appointments} weeksBack={4} repUserId={m.user_id} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* TAB: AI COACHING */}
                {analyticsTeamTab === "coaching" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div className="premium-card" style={{ background: "rgba(214,178,74,0.03)", borderColor: "rgba(214,178,74,0.15)" }}>
                      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
                        AI coaching insights are computed from each rep's live performance metrics. Reps needing attention are shown first. Insights update automatically as team data changes.
                      </p>
                    </div>
                    {coachingInsights.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>No team members to coach yet.</div>}
                    {coachingInsights.sort((a, b) => { const p = { attention: 0, warning: 1, good: 2, top: 3 }; return (p[a.level] ?? 2) - (p[b.level] ?? 2); }).map(m => {
                      const initials = m.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                      return (
                        <div key={m.id} style={{ display: "flex", gap: "16px", padding: "18px 20px", background: "var(--surface-color)", border: `1px solid var(--border-color)`, borderLeft: `4px solid ${m.border}`, borderRadius: "var(--radius-md)" }}>
                          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: `${m.border}22`, border: `2px solid ${m.border}44`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", color: m.border, fontSize: "0.88rem", flexShrink: 0 }}>{initials}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: "700", fontSize: "0.95rem" }}>{m.name}</span>
                              <span style={{ padding: "2px 8px", borderRadius: "999px", background: `${m.border}22`, color: m.border, fontSize: "0.68rem", fontWeight: "700", border: `1px solid ${m.border}44` }}>{m.role}</span>
                              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginLeft: "auto" }}>Score: {m.teamScore ?? 0}</span>
                            </div>
                            <p style={{ fontSize: "0.82rem", color: "var(--text-primary)", marginBottom: "8px", lineHeight: "1.5" }}>{m.insight}</p>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", background: "rgba(255,255,255,0.03)", padding: "10px 12px", borderRadius: "6px" }}>
                              <span style={{ fontSize: "0.78rem", color: m.border, fontWeight: "700", flexShrink: 0 }}>→</span>
                              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0, lineHeight: "1.5" }}>{m.action}</p>
                            </div>
                            <div style={{ display: "flex", gap: "16px", marginTop: "10px", fontSize: "0.72rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                              <span>{m.leadsCount} leads</span>
                              <span>{m.wonCount} won</span>
                              <span>{m.winRate}% win rate</span>
                              <span>{m.appointmentsCount} appts</span>
                              <span style={{ color: "var(--accent-emerald)", fontWeight: "600" }}>${m.wonRevenue.toLocaleString()} revenue</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            );
          })()
        )}
      </div>
    );
  };

  // 8. APPOINTMENTS CALENDAR
  const renderAppointments = () => {
    const upcoming = appointments.filter(apt => ["upcoming", "confirmed", "pending"].includes(String(apt.status).toLowerCase()));
    const completed = appointments.filter(apt => ["completed"].includes(String(apt.status).toLowerCase()));
    const cancelled = appointments.filter(apt => ["cancelled"].includes(String(apt.status).toLowerCase()));

    return (
      <div className="grid-2" style={{ alignItems: "stretch" }}>
        
        {/* Left Side: Real appointments list categorized */}
        <div className="premium-card" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "4px" }}>Appointments Workspace</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Manage all strategy sessions, view Google Meet links, and handle scheduling conflicts.
            </p>
          </div>

          {/* Upcoming list */}
          <div>
            <h4 style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--accent-gold)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Clock size={14} />
              <span>Upcoming Consultations ({upcoming.length})</span>
            </h4>
            {upcoming.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", padding: "12px", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-sm)" }}>No upcoming appointments scheduled.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {upcoming.map((apt) => (
                  <div key={apt.id} style={{ background: "var(--surface-color)", border: "1px solid var(--border-color)", padding: "14px", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                    <div style={{ flexGrow: 1 }}>
                      <span style={{ fontSize: "0.7rem", color: "var(--accent-gold)" }}>{apt.time} • {apt.date}</span>
                      <h5 style={{ fontSize: "0.85rem", fontWeight: "600", marginTop: "2px" }}>{apt.clientName || apt.title}</h5>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "4px 0" }}>{apt.type || apt.description}</p>
                      {apt.meet_link && (
                        <a 
                          href={apt.meet_link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "var(--accent-emerald)", textDecoration: "underline", marginTop: "6px" }}
                        >
                          <Play size={10} />
                          <span>Join Google Meet</span>
                        </a>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                      <span className="badge-status upcoming" style={{ background: "rgba(214,178,74,0.1)", color: "var(--accent-gold)", padding: "2px 8px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: "600" }}>
                        {apt.status}
                      </span>
                      <button 
                        className="btn btn-danger btn-sm" 
                        onClick={() => cancelGoogleMeeting(apt.id)}
                        style={{ padding: "4px 8px", fontSize: "0.7rem" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed list */}
          <div>
            <h4 style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--accent-emerald)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle2 size={14} />
              <span>Completed Sessions ({completed.length})</span>
            </h4>
            {completed.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", padding: "12px", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-sm)" }}>No completed appointments yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {completed.map((apt) => (
                  <div key={apt.id} style={{ background: "var(--surface-color)", border: "1px solid var(--border-color)", opacity: 0.8, padding: "14px", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{apt.time} • {apt.date}</span>
                      <h5 style={{ fontSize: "0.85rem", fontWeight: "600", marginTop: "2px" }}>{apt.clientName || apt.title}</h5>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{apt.type || apt.description}</p>
                    </div>
                    <span style={{ background: "rgba(109,201,165,0.1)", color: "var(--accent-emerald)", padding: "2px 8px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: "600" }}>
                      Completed
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cancelled list */}
          <div>
            <h4 style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Trash2 size={14} />
              <span>Cancelled Sessions ({cancelled.length})</span>
            </h4>
            {cancelled.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", padding: "12px", border: "1px dashed var(--border-color)", borderRadius: "var(--radius-sm)" }}>No cancelled appointments.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {cancelled.map((apt) => (
                  <div key={apt.id} style={{ background: "var(--surface-color)", border: "1px solid var(--border-color)", opacity: 0.6, padding: "14px", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{apt.time} • {apt.date}</span>
                      <h5 style={{ fontSize: "0.85rem", fontWeight: "600", marginTop: "2px", textDecoration: "line-through" }}>{apt.clientName || apt.title}</h5>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{apt.type || apt.description}</p>
                    </div>
                    <span style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", padding: "2px 8px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: "600" }}>
                      Cancelled
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Settings & Google Calendar info */}
        <div className="premium-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "20px" }}>Google Calendar Integration</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: "1.6", marginBottom: "16px" }}>
              All CRM consultations are bi-directionally synchronized with Google Calendar to streamline team schedules.
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", lineHeight: "1.5", marginBottom: "24px" }}>
              Status: <strong>{googleConnected ? "Connected ✅" : "Disconnected ❌ (Simulation Mode Active)"}</strong>
            </p>

            <div style={{ background: "rgba(212,175,55,0.03)", border: "1px solid rgba(212,175,55,0.1)", padding: "16px", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              <h5 style={{ color: "var(--accent-gold)", fontWeight: "600", marginBottom: "6px" }}>How it works:</h5>
              <ul style={{ paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <li>Connected users generate authentic Google Calendar events.</li>
                <li>Each event automatically creates a unique Google Meet link.</li>
                <li>Prospects receive automated email invitations.</li>
                <li>Updating status inside the CRM updates the external calendar.</li>
              </ul>
            </div>
          </div>

          <button 
            className={`btn ${googleConnected ? "btn-secondary" : "btn-gold"}`} 
            onClick={() => setDashboardSection("integrations")} 
            style={{ width: "100%", marginTop: "32px" }}
          >
            {googleConnected ? "Manage Google Calendar Connection" : "Connect Google Calendar"}
          </button>
        </div>

      </div>
    );
  };

  // 9. INTEGRATIONS CENTER (STANDALONE SUBPATH)
  const renderIntegrations = () => {
    return (
      <div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "32px" }}>
          Manage your active API hooks. Standalone Connection status logs trigger automatically on payload delivery.
        </p>

        <div className="integration-grid" style={{ marginBottom: "40px" }}>
          {integrations.map((integ) => (
            <div key={integ.id} className="integration-card">
              <div className="integration-top">
                <div className="integration-icon">
                  {integ.logo === "MessageSquare" && <MessageSquare size={20} />}
                  {integ.logo === "Mail" && <Mail size={20} />}
                  {integ.logo === "Globe" && <Globe size={20} />}
                  {integ.logo === "Terminal" && <Terminal size={20} />}
                  {integ.logo === "Calendar" && <Calendar size={20} />}
                  {integ.logo === "CreditCard" && <CreditCard size={20} />}
                  {integ.logo === "Key" && <Key size={20} />}
                </div>
                <span className={`status-badge ${integ.connected ? "connected" : "disconnected"}`}>
                  {integ.connected ? "Connected" : "Disconnected"}
                </span>
              </div>

              <h4 className="integration-name">{integ.name}</h4>
              <p className="integration-desc">{integ.desc}</p>

              <div className="integration-footer">
                <span className="activity-log-label" title={integ.lastActivity}>
                  {integ.lastActivity}
                </span>
                
                <div style={{ display: "flex", gap: "8px" }}>
                  {integ.connected && (
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => { setActiveConfigModal(integ.id); }}
                      style={{ padding: "4px 8px", fontSize: "0.7rem" }}
                    >
                      Config
                    </button>
                  )}
                  <button 
                    className={`btn btn-sm ${integ.connected ? "btn-danger" : "btn-emerald"}`}
                    onClick={() => handleIntegrationToggle(integ.id)}
                    style={{ padding: "4px 10px", fontSize: "0.7rem" }}
                  >
                    {integ.connected ? "Disconnect" : "Connect"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Configuration settings modal popup */}
        {activeConfigModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="premium-card" style={{ width: "100%", maxWidth: "450px" }}>
              <h3 className="serif-display" style={{ fontSize: "1.3rem", marginBottom: "16px" }}>
                Configure <span className="editorial-italic">{activeConfigModal.toUpperCase()} credentials</span>
              </h3>

              {activeConfigModal === "wordpress" ? (
                <div className="form-group">
                  <label className="form-label">WordPress Landing URL</label>
                  <input type="text" value={wpUrl} onChange={(e) => setWpUrl(e.target.value)} className="form-input" />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Developer API Client Secret</label>
                  <input type="text" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} className="form-input" />
                </div>
              )}

              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "20px" }}>
                * Standard auth hooks validated. Direct webhooks reconciled on server.
              </p>

              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn btn-emerald btn-sm" onClick={() => setActiveConfigModal(null)} style={{ flexGrow: "1" }}>
                  Save Configuration
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setActiveConfigModal(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Activity log feeds inside stand-alone page */}
        <div className="premium-card">
          <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "16px" }}>Live Integration Activity Log</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "180px", overflowY: "auto" }}>
            {activities.map((act) => (
              <div key={act.id} style={{ display: "flex", justifySpace: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>
                  [ {act.type.toUpperCase()} ] {act.message}
                </span>
                <span style={{ color: "var(--text-muted)" }}>{act.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 10. BILLING CENTER (STANDALONE SUBPATH)
  const renderBilling = () => {
    return (
      <div className="grid-2" style={{ alignItems: "stretch" }}>
        
        {/* Subscription parameters */}
        <div className="premium-card gold-glow">
          <span className="pricing-tier" style={{ color: "var(--accent-gold)", fontSize: "0.8rem", fontWeight: "600" }}>
            ACTIVE SYSTEM TIER
          </span>
          <h3 className="serif-display" style={{ fontSize: "1.75rem", margin: "8px 0" }}>
            {billingPlan.name}
          </h3>
          <div style={{ fontSize: "2rem", fontWeight: "600", marginBottom: "24px" }}>
            {billingPlan.price}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "0.85rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "24px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifySpace: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Monthly Leads Captured:</span>
              <strong>{billingPlan.leadsCaptured} / {billingPlan.leadLimit}</strong>
            </div>
            <div style={{ display: "flex", justifySpace: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>AI Credits Index:</span>
              <strong>{billingPlan.aiCreditsUsed} / {billingPlan.aiCreditsLimit}</strong>
            </div>
            <div style={{ display: "flex", justifySpace: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Renewal billing date:</span>
              <strong>{billingPlan.billingDate}</strong>
            </div>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            style={{ width: "100%", ...(!hasPermission(organizationRole, PERMISSIONS.MANAGE_BILLING) ? { opacity: 0.45, cursor: "not-allowed" } : {}) }}
            disabled={!hasPermission(organizationRole, PERMISSIONS.MANAGE_BILLING)}
            title={!hasPermission(organizationRole, PERMISSIONS.MANAGE_BILLING) ? `Role: ${organizationRole} does not have billing management access. Only Owners can manage billing.` : undefined}
            onClick={() => {
              if (!hasPermission(organizationRole, PERMISSIONS.MANAGE_BILLING)) return;
              alert("Billing migration requires consultant approval. Reach hotline +91 63743 85901.");
            }}
          >
            Change Subscription Plan
          </button>
        </div>

        {/* Invoice roster download */}
        <div className="premium-card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "16px" }}>Reconciled Invoices History</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.85rem" }}>
            <div style={{ display: "flex", justifySpace: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
              <div>
                <strong>Inv #EL-2026-04</strong>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Paid: April 25, 2026</p>
              </div>
              <span style={{ color: "var(--accent-emerald)", cursor: "pointer" }} onClick={() => alert("Simulating Invoice PDF download...")}>Download PDF ($149)</span>
            </div>
            <div style={{ display: "flex", justifySpace: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
              <div>
                <strong>Inv #EL-2026-03</strong>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Paid: March 25, 2026</p>
              </div>
              <span style={{ color: "var(--accent-emerald)", cursor: "pointer" }} onClick={() => alert("Simulating Invoice PDF download...")}>Download PDF ($149)</span>
            </div>
          </div>
        </div>

      </div>
    );
  };

  // 11. TEAM MANAGEMENT
  const renderTeam = () => {
    const canInvite = hasPermission(organizationRole, PERMISSIONS.INVITE_MEMBERS);
    const canChangeRole = hasPermission(organizationRole, PERMISSIONS.CHANGE_ROLES);
    const canRemove = hasPermission(organizationRole, PERMISSIONS.REMOVE_MEMBERS);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* INVITE NEW MEMBER */}
        {canInvite && (
          <div className="premium-card">
            <h3 style={{ fontSize: "1.1rem", fontWeight: "600", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", marginBottom: "20px" }}>
              Invite Team Member
            </h3>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Email Address</label>
                <input 
                  type="email"
                  className="input-field"
                  placeholder="name@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "#111", color: "#fff" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Workspace Role</label>
                <select 
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  style={{
                    backgroundColor: "#111",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    color: "#fff",
                    padding: "8px 12px",
                    width: "100%",
                    fontSize: "0.8rem",
                    height: "36px"
                  }}
                >
                  <option value="Owner">Owner</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Sales Rep">Sales Rep</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
              <button 
                className="btn"
                style={{ height: "36px", padding: "0 20px", backgroundColor: "var(--accent-gold)", color: "#000", fontWeight: "600" }}
                onClick={async () => {
                  if (!inviteEmail.trim()) {
                    alert("Please specify a valid email address.");
                    return;
                  }
                  try {
                    await inviteMember(inviteEmail, inviteRole);
                    setInviteEmail("");
                  } catch (e) {
                    // Alert handles error
                  }
                }}
              >
                Send Invitation
              </button>
            </div>
          </div>
        )}

        {/* TEAM DIRECTORY */}
        <div className="premium-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "20px" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "600" }}>Team Directory</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                Workspace seats: {organizationMembers.length} active / {organizationInvitations.length} pending
              </p>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                  <th style={{ padding: "12px 16px" }}>Name / Email</th>
                  <th style={{ padding: "12px 16px" }}>Role</th>
                  <th style={{ padding: "12px 16px" }}>Joined Date</th>
                  <th style={{ padding: "12px 16px" }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* ACTIVE MEMBERS */}
                {organizationMembers.map((m) => {
                  const memberName = m.profiles?.full_name || m.profiles?.email?.split("@")[0] || "Team Member";
                  const memberEmail = m.profiles?.email || "Unknown email";
                  const isSelf = m.user_id === user?.id;
                  const joinedDate = m.created_at ? new Date(m.created_at).toLocaleDateString() : "-";
                  const isAdminChangingOwner = m.role === "Owner" && organizationRole === "Admin";

                  return (
                    <tr key={m.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {m.profiles?.avatar_url ? (
                            <img 
                              src={m.profiles.avatar_url} 
                              alt="Avatar" 
                              style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }} 
                            />
                          ) : (
                            <div className="user-avatar" style={{ width: "28px", height: "28px", fontSize: "0.7rem", flexShrink: 0 }}>
                              {memberName.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span style={{ fontWeight: "600", color: "#fff" }}>{memberName}</span>
                            {isSelf && <span style={{ color: "var(--accent-gold)", fontSize: "0.7rem", marginLeft: "6px" }}>(You)</span>}
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{memberEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {canChangeRole && !isSelf && !isAdminChangingOwner ? (
                          <select 
                            value={m.role}
                            onChange={(e) => changeMemberRole(m.id, e.target.value)}
                            style={{
                              backgroundColor: "#111",
                              border: "1px solid var(--border-color)",
                              borderRadius: "4px",
                              color: "#fff",
                              padding: "4px 8px",
                              fontSize: "0.75rem"
                            }}
                          >
                            <option value="Owner">Owner</option>
                            <option value="Admin">Admin</option>
                            <option value="Manager">Manager</option>
                            <option value="Sales Rep">Sales Rep</option>
                            <option value="Viewer">Viewer</option>
                          </select>
                        ) : (
                          <span style={{ color: m.role === "Owner" ? "var(--accent-gold)" : "var(--text-primary)" }}>{m.role}</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>
                        {joinedDate}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          backgroundColor: "rgba(16, 185, 129, 0.1)",
                          color: "var(--accent-emerald)",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "0.7rem",
                          fontWeight: "600"
                        }}>
                          Active
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        {canRemove && !isSelf && !isAdminChangingOwner && (
                          <button 
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "4px 10px", color: "#ff8b8b", borderColor: "#ff8b8b" }}
                            onClick={() => removeMember(m.id)}
                          >
                            Remove Member
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* PENDING INVITATIONS */}
                {organizationInvitations.map((inv) => {
                  const invitedDate = inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "-";
                  return (
                    <tr key={inv.id} style={{ borderBottom: "1px solid var(--border-color)", backgroundColor: "rgba(255, 255, 255, 0.01)" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div className="user-avatar" style={{ width: "28px", height: "28px", fontSize: "0.7rem", flexShrink: 0, backgroundColor: "#222", color: "var(--text-muted)" }}>
                            INV
                          </div>
                          <div>
                            <span style={{ color: "var(--text-muted)", fontWeight: "500" }}>{inv.email}</span>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Invitation sent</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>
                        {inv.role}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>
                        {invitedDate}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          backgroundColor: "rgba(245, 158, 11, 0.1)",
                          color: "var(--accent-gold)",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "0.7rem",
                          fontWeight: "600"
                        }}>
                          Pending Invitation
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          {canInvite && (
                            <>
                              <button 
                                className="btn btn-secondary btn-sm"
                                style={{ padding: "4px 8px" }}
                                onClick={() => resendInvitation(inv.id)}
                              >
                                Resend
                              </button>
                              <button 
                                className="btn btn-secondary btn-sm"
                                style={{ padding: "4px 8px", color: "#ff8b8b", borderColor: "#ff8b8b" }}
                                onClick={() => revokeInvitation(inv.id)}
                              >
                                Revoke
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {organizationMembers.length === 0 && organizationInvitations.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>
                      No members or invitations found in this workspace.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* WORKSPACE AUDIT LOGS */}
        <div className="premium-card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: "600", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px", marginBottom: "16px" }}>
            Workspace Activity Audit Logs
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "300px", overflowY: "auto", paddingRight: "8px" }}>
            {auditLogs.length > 0 ? (
              auditLogs.map((log) => {
                const dateStr = new Date(log.created_at).toLocaleString();
                const userName = getAuditUserString(log.user_id);
                return (
                  <div key={log.id} style={{ fontSize: "0.8rem", padding: "10px", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <strong style={{ color: "var(--accent-gold)" }}>{log.action}</strong>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{dateStr}</span>
                    </div>
                    <p style={{ margin: 0, color: "var(--text-primary)" }}>
                      Resource: <span style={{ textTransform: "capitalize", fontWeight: "600" }}>{log.resource_type}</span>
                    </p>
                    <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Actor: <strong>{userName}</strong>
                    </p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <pre style={{ margin: "6px 0 0 0", padding: "6px", fontSize: "0.7rem", backgroundColor: "#000", borderRadius: "4px", overflowX: "auto", color: "var(--text-muted)" }}>
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })
            ) : (
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>No audit log activity found.</span>
            )}
          </div>
        </div>

      </div>
    );
  };

  // 12. GENERAL SETTINGS
  const renderSettings = () => {
    const isOwnerOrAdmin = organizationRole === "Owner" || organizationRole === "Admin";
    
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "800px" }}>
        <div className="premium-card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "20px", color: "var(--accent-gold)" }}>
            Workspace Settings & Branding
          </h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!isOwnerOrAdmin) {
              alert("You must be an Owner or Admin to update workspace settings.");
              return;
            }
            try {
              await updateBranding({
                name: settingsOrgName,
                logo_url: settingsLogoUrl || null,
                primary_color: settingsPrimaryColor,
                custom_domain: settingsCustomDomain || null
              });
              alert("Workspace settings saved successfully.");
            } catch (err) {
              console.error(err);
            }
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div className="form-group">
                <label className="form-label" style={{ display: "block", marginBottom: "6px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Workspace Name
                </label>
                <input 
                  type="text" 
                  value={settingsOrgName} 
                  onChange={(e) => setSettingsOrgName(e.target.value)} 
                  className="input-field" 
                  style={{ width: "100%", padding: "10px 14px", backgroundColor: "#111", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#fff" }}
                  disabled={!isOwnerOrAdmin}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: "block", marginBottom: "6px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Custom Domain
                </label>
                <input 
                  type="text" 
                  value={settingsCustomDomain} 
                  onChange={(e) => setSettingsCustomDomain(e.target.value)} 
                  className="input-field" 
                  style={{ width: "100%", padding: "10px 14px", backgroundColor: "#111", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#fff" }}
                  placeholder="crm.company.com"
                  disabled={!isOwnerOrAdmin}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: "block", marginBottom: "6px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Logo URL
                </label>
                <input 
                  type="text" 
                  value={settingsLogoUrl} 
                  onChange={(e) => setSettingsLogoUrl(e.target.value)} 
                  className="input-field" 
                  style={{ width: "100%", padding: "10px 14px", backgroundColor: "#111", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#fff" }}
                  placeholder="https://example.com/logo.png"
                  disabled={!isOwnerOrAdmin}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: "block", marginBottom: "6px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Workspace Theme Color
                </label>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <input 
                    type="color" 
                    value={settingsPrimaryColor} 
                    onChange={(e) => setSettingsPrimaryColor(e.target.value)} 
                    style={{ backgroundColor: "transparent", border: "none", width: "40px", height: "40px", cursor: "pointer" }}
                    disabled={!isOwnerOrAdmin}
                  />
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{settingsPrimaryColor}</span>
                </div>
              </div>
            </div>

            {isOwnerOrAdmin && (
              <button type="submit" className="btn btn-gold btn-sm" style={{ marginTop: "24px", padding: "10px 20px" }}>
                Save Workspace Settings
              </button>
            )}
          </form>
        </div>

        <div className="premium-card">
          <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "16px" }}>Workspace Limits & Subscription</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
            <div style={{ padding: "16px", backgroundColor: "rgba(255, 255, 255, 0.02)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Active Plan</span>
              <strong style={{ fontSize: "1.1rem", color: "var(--accent-gold)", textTransform: "capitalize" }}>
                {currentOrganization?.plan || "Free"}
              </strong>
            </div>

            <div style={{ padding: "16px", backgroundColor: "rgba(255, 255, 255, 0.02)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Subscription Status</span>
              <strong style={{ fontSize: "1.1rem", color: "var(--accent-emerald)", textTransform: "capitalize" }}>
                {currentOrganization?.subscription_status || "Active"}
              </strong>
            </div>

            <div style={{ padding: "16px", backgroundColor: "rgba(255, 255, 255, 0.02)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Seat Allocation</span>
              <strong style={{ fontSize: "1.1rem" }}>
                {organizationMembers.length} / {currentOrganization?.seat_limit || 5} Seats
              </strong>
            </div>

            <div style={{ padding: "16px", backgroundColor: "rgba(255, 255, 255, 0.02)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>AI Credit Allocation</span>
              <strong style={{ fontSize: "1.1rem" }}>
                100 / {currentOrganization?.ai_credit_limit || 100} Credits
              </strong>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 13. SUPPORT HUB (STANDALONE IN SIDEBAR)
  const renderSupport = () => {
    return (
      <>
      <div className="premium-card">
        <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "16px", color: "var(--accent-gold)" }}>SaaS Support Desk Routing</h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "24px" }}>
          Access premium ticket creation or strategize workflows with advisor callback lines.
        </p>
        <button className="btn btn-gold" onClick={() => navigateTo("contact")}>
          <span>Access Premium Strategy & Ticket Center</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* DEVELOPER PERMISSION DEBUG PANEL                             */}
      {/* Visible only when localStorage.elevate_dev_mode === "true"   */}
      {/* ============================================================ */}
      {typeof window !== "undefined" && localStorage.getItem("elevate_dev_mode") === "true" && (
        <div className="premium-card" style={{
          border: "1px solid rgba(214, 178, 74, 0.35)",
          background: "rgba(214, 178, 74, 0.04)",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Corner badge */}
          <div style={{
            position: "absolute", top: 0, right: 0,
            background: "rgba(214,178,74,0.15)",
            borderBottomLeftRadius: "8px",
            padding: "4px 12px",
            fontSize: "0.65rem",
            fontWeight: "700",
            color: "var(--accent-gold)",
            letterSpacing: "0.08em",
            textTransform: "uppercase"
          }}>DEV MODE</div>

          <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "var(--accent-gold)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            🔒 RBAC Permission Inspector
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.82rem" }}>
              <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em" }}>Active User</span>
                <div style={{ color: "#fff", fontWeight: "600", marginTop: "4px" }}>{user?.email || "Not logged in"}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>{user?.id || "—"}</div>
              </div>
              <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em" }}>Active Workspace</span>
                <div style={{ color: "#fff", fontWeight: "600", marginTop: "4px" }}>{currentOrganization?.name || "No Workspace"}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>{currentOrganization?.id || "—"}</div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em" }}>Assigned Role</span>
                <div style={{
                  display: "inline-flex", alignItems: "center",
                  marginTop: "6px", padding: "3px 12px",
                  borderRadius: "999px",
                  background: organizationRole === "Owner" ? "rgba(214,178,74,0.15)" : organizationRole === "Admin" ? "rgba(109,201,165,0.12)" : "rgba(255,255,255,0.06)",
                  color: organizationRole === "Owner" ? "var(--accent-gold)" : organizationRole === "Admin" ? "var(--accent-emerald)" : "var(--text-primary)",
                  border: organizationRole === "Owner" ? "1px solid rgba(214,178,74,0.3)" : "1px solid rgba(255,255,255,0.1)",
                  fontWeight: "700", fontSize: "0.8rem"
                }}>
                  {organizationRole || "No Role"}
                </div>
              </div>
            </div>

            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "10px" }}>Granted Permissions</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {Object.values(PERMISSIONS).map(perm => {
                  const granted = hasPermission(organizationRole, perm);
                  return (
                    <span key={perm} style={{
                      padding: "3px 9px",
                      borderRadius: "999px",
                      fontSize: "0.68rem",
                      fontWeight: "600",
                      background: granted ? "rgba(109,201,165,0.12)" : "rgba(255,255,255,0.04)",
                      color: granted ? "var(--accent-emerald)" : "rgba(255,255,255,0.25)",
                      border: granted ? "1px solid rgba(109,201,165,0.25)" : "1px solid rgba(255,255,255,0.06)",
                      textDecoration: granted ? "none" : "line-through",
                      letterSpacing: "0.02em"
                    }}>
                      {perm}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
            💡 To disable this panel, run <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: "4px", color: "var(--accent-gold)" }}>localStorage.removeItem("elevate_dev_mode")</code> in the browser console.
          </div>
        </div>
      )}
      </>
    );
  };

  // 15. AI AGENT CENTER (PHASE 7A NEW VIEW)
  const renderAgentCenter = () => {
    const completedTasks = agentTasks.filter(t => t.status === "completed");
    const pendingTasks = agentTasks.filter(t => t.status === "pending_approval");
    const totalMemories = agentMemories.length;
    
    const closingProb = leads.filter(l => !["Closed Lost", "Closed Won"].includes(l.status)).length > 0
      ? leads.filter(l => !["Closed Lost", "Closed Won"].includes(l.status)).reduce((acc, l) => acc + (Number(l.score) || 0), 0) / leads.filter(l => !["Closed Lost", "Closed Won"].includes(l.status)).length
      : 0;
    
    const forecastRevenue = leads
      .filter(l => !["Closed Lost", "Closed Won"].includes(l.status))
      .reduce((acc, l) => acc + ((Number(l.value) || 0) * ((Number(l.score) || 0) / 100)), 0);
      
    const closedWonValue = leads.filter(l => l.status === "Closed Won").reduce((acc, l) => acc + (Number(l.value) || 0), 0);

    const handleSendCommand = async (e) => {
      e.preventDefault();
      if (!commandText.trim()) return;

      const userCmd = commandText.trim();
      setCommandLogs(prev => [...prev, { type: "user", text: userCmd }]);
      setCommandText("");
      setIsExecutingCommand(true);

      try {
        const result = await executeAgentCommand(userCmd);
        let replyText = `[AI Agent reasoning: ${result.explanation}]\n${result.message}`;
        
        if (result.action === "filter_leads" && result.data?.leads) {
          const matchingLeads = result.data.leads;
          if (matchingLeads.length === 0) {
            replyText += "\nNo leads matched the criteria.";
          } else {
            replyText += "\nMatching CRM Prospects:\n" + matchingLeads.map((l, idx) => `${idx + 1}. ${l.name} (${l.company || "No Company"}) - Score: ${l.score || 0}, Priority: ${l.priority}, Nurture: ${l.nurture_status}`).join("\n");
          }
        } else if (result.action === "create_campaign" && result.data) {
          setCampaignName(result.data.campaignName);
          setCampaignGoal(result.data.campaignGoal);
          setSelectedLeadIds(result.data.leadIds || []);
          setActiveCampaignTab("builder");
          setDashboardSection("campaigns");
          replyText += `\nTransferred details to Campaign Builder. Named: ${result.data.campaignName}`;
        } else if (result.action === "generate_forecast" && result.data) {
          replyText += `\nForecast Revenue: $${result.data.forecastRevenue.toLocaleString()} (Closing Prob: ${result.data.averageClosingProbability}%)`;
        }

        setCommandLogs(prev => [...prev, { type: "agent", text: replyText }]);
      } catch (err) {
        setCommandLogs(prev => [...prev, { type: "agent", text: `Error executing command: ${err.message}` }]);
      } finally {
        setIsExecutingCommand(false);
      }
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
          <button 
            className={`btn btn-sm ${activeAgentTab === "dashboard" ? "btn-gold" : "btn-secondary"}`}
            onClick={() => setActiveAgentTab("dashboard")}
          >
            Agent Dashboard
          </button>
          <button 
            className={`btn btn-sm ${activeAgentTab === "tasks" ? "btn-gold" : "btn-secondary"}`}
            onClick={() => setActiveAgentTab("tasks")}
          >
            Pending Approvals ({pendingTasks.length})
          </button>
          <button 
            className={`btn btn-sm ${activeAgentTab === "memories" ? "btn-gold" : "btn-secondary"}`}
            onClick={() => setActiveAgentTab("memories")}
          >
            Memory Registry
          </button>
        </div>

        {activeAgentTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="premium-card gold-glow" style={{ display: "flex", alignItems: "center", gap: "20px", padding: "24px", background: "linear-gradient(135deg, rgba(214,178,74,0.08) 0%, rgba(0,0,0,0.4) 100%)" }}>
              <div style={{ position: "relative", width: "48px", height: "48px", borderRadius: "50%", background: "rgba(214,178,74,0.15)", display: "grid", placeItems: "center", border: "1px solid var(--accent-gold)", boxShadow: "0 0 15px var(--accent-gold-glow)" }}>
                <Bot size={24} style={{ color: "var(--accent-gold)" }} />
                <span className="pulse-indicator" style={{ position: "absolute", bottom: "2px", right: "2px", width: "10px", height: "10px", borderRadius: "50%", background: "var(--accent-emerald)", border: "2px solid #060606" }} />
              </div>
              <div>
                <h4 style={{ fontSize: "1.05rem", fontWeight: "600", color: "#FFF" }}>Autonomous AI Agent: ONLINE</h4>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  Active & Monitoring CRM events. Running in **Approval-Required Mode**. Accidental sends are blocked.
                </p>
              </div>
            </div>

            <div className="grid-5" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
              <div className="premium-card" style={{ padding: "18px" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Agent Status</span>
                <strong style={{ fontSize: "1.3rem", display: "block", marginTop: "6px", color: "var(--accent-emerald)" }}>Active</strong>
              </div>
              <div className="premium-card" style={{ padding: "18px" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Tasks Completed</span>
                <strong style={{ fontSize: "1.3rem", display: "block", marginTop: "6px" }}>{completedTasks.length}</strong>
              </div>
              <div className="premium-card" style={{ padding: "18px" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Leads Processed</span>
                <strong style={{ fontSize: "1.3rem", display: "block", marginTop: "6px" }}>{totalMemories}</strong>
              </div>
              <div className="premium-card" style={{ padding: "18px" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Projected Revenue</span>
                <strong style={{ fontSize: "1.3rem", display: "block", marginTop: "6px", color: "var(--accent-emerald)" }}>${Math.round(forecastRevenue + closedWonValue).toLocaleString()}</strong>
              </div>
              <div className="premium-card" style={{ padding: "18px" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Pending Approvals</span>
                <strong style={{ fontSize: "1.3rem", display: "block", marginTop: "6px", color: "var(--accent-gold)" }}>{pendingTasks.length}</strong>
              </div>
            </div>

            <div className="premium-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Terminal size={18} style={{ color: "var(--accent-gold)" }} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: "600" }}>Executive Command Center</h3>
              </div>
              
              <div style={{ 
                height: "250px", 
                background: "#08090C", 
                border: "1px solid var(--border-color)", 
                borderRadius: "8px", 
                padding: "16px", 
                fontFamily: "monospace", 
                fontSize: "0.8rem", 
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "10px"
              }}>
                {commandLogs.map((log, idx) => (
                  <div key={idx} style={{ 
                    color: log.type === "user" ? "var(--accent-gold)" : "var(--text-secondary)",
                    borderLeft: log.type === "user" ? "2px solid var(--accent-gold)" : "2px solid rgba(255,255,255,0.05)",
                    paddingLeft: "10px",
                    whiteSpace: "pre-wrap"
                  }}>
                    <strong>{log.type === "user" ? "> " : "[AI Copilot]: "}</strong>
                    {log.text}
                  </div>
                ))}
                {isExecutingCommand && (
                  <div style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                    Analyzing NLP instruction and querying Supabase...
                  </div>
                )}
              </div>

              <form onSubmit={handleSendCommand} style={{ display: "flex", gap: "10px" }}>
                <input 
                  type="text"
                  className="form-input"
                  style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", padding: "10px 14px", borderRadius: "8px", color: "#FFF", flexGrow: 1, fontSize: "0.85rem" }}
                  placeholder='Try typing: "Show hot leads" or "Send followups to all at-risk leads" or "Generate pipeline forecast"'
                  value={commandText}
                  onChange={(e) => setCommandText(e.target.value)}
                  disabled={isExecutingCommand}
                />
                <button 
                  type="submit" 
                  className="btn btn-gold" 
                  style={{ minWidth: "100px", fontSize: "0.85rem" }}
                  disabled={isExecutingCommand}
                >
                  Execute
                </button>
              </form>
            </div>
          </div>
        )}

        {activeAgentTab === "tasks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "600" }}>Pending Approvals Queue ({pendingTasks.length})</h3>
            
            {pendingTasks.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "40px", border: "1px dashed var(--border-color)", borderRadius: "10px" }}>
                All agent tasks evaluated and approved. No actions are currently pending user approval.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {pendingTasks.map((task) => {
                  const isEditing = editingTaskId === task.id;
                  const draft = task.draft_data || {};
                  return (
                    <div key={task.id} className="premium-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                        <div>
                          <span style={{ fontSize: "0.7rem", color: "var(--accent-gold)", fontWeight: "600", textTransform: "uppercase" }}>
                            {task.task_type.replace("_", " ")}
                          </span>
                          <h4 style={{ fontSize: "1rem", fontWeight: "600", marginTop: "4px" }}>{task.title}</h4>
                          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>Recipient: {task.leads?.name || "crm prospect"} ({draft.to})</p>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button 
                            className="btn btn-emerald btn-sm"
                            onClick={async () => {
                              if (!hasPermission(organizationRole, PERMISSIONS.EXECUTE_AGENT_TASKS)) return;
                              try {
                                const res = await approveAgentTask(task.id);
                                alert(res.logs || "Task executed successfully!");
                              } catch (err) {
                                alert("Execution failed: " + err.message);
                              }
                            }}
                            disabled={!hasPermission(organizationRole, PERMISSIONS.EXECUTE_AGENT_TASKS)}
                            title={!hasPermission(organizationRole, PERMISSIONS.EXECUTE_AGENT_TASKS) ? `Role: ${organizationRole} is not permitted to execute agent tasks.` : undefined}
                            style={!hasPermission(organizationRole, PERMISSIONS.EXECUTE_AGENT_TASKS) ? { opacity: 0.45, cursor: "not-allowed" } : {}}
                          >
                            Approve & Execute
                          </button>
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => rejectAgentTask(task.id)}
                            disabled={!hasPermission(organizationRole, PERMISSIONS.EXECUTE_AGENT_TASKS)}
                            title={!hasPermission(organizationRole, PERMISSIONS.EXECUTE_AGENT_TASKS) ? `Role: ${organizationRole} is not permitted to reject agent tasks.` : undefined}
                            style={!hasPermission(organizationRole, PERMISSIONS.EXECUTE_AGENT_TASKS) ? { opacity: 0.45, cursor: "not-allowed" } : {}}
                          >
                            Reject
                          </button>
                        </div>
                      </div>

                      <div style={{ background: "rgba(214,178,74,0.03)", border: "1px solid rgba(214,178,74,0.1)", padding: "12px", borderRadius: "6px" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--accent-gold)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Brain size={12} />
                          <span>AI Agent Reasoning</span>
                        </span>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px", lineHeight: "1.4" }}>
                          {task.reasoning}
                        </p>
                      </div>

                      <div style={{ background: "rgba(0,0,0,0.1)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: "600" }}>Draft Subject & Body Preview</span>
                          <button 
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                            onClick={() => setEditingTaskId(isEditing ? null : task.id)}
                          >
                            {isEditing ? "Close Editor" : "Edit Draft Copy"}
                          </button>
                        </div>

                        {isEditing ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Subject</label>
                              <input 
                                type="text"
                                className="form-input"
                                style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", padding: "6px", borderRadius: "4px", fontSize: "0.8rem", color: "#FFF" }}
                                value={draft.subject || ""}
                                onChange={(e) => {
                                  const updatedDraft = { ...draft, subject: e.target.value };
                                  setAgentTasks(prev => prev.map(t => t.id === task.id ? { ...t, draft_data: updatedDraft } : t));
                                }}
                              />
                            </div>
                            <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Email Body (HTML supported)</label>
                              <textarea 
                                className="form-input"
                                rows={6}
                                style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", padding: "8px", borderRadius: "4px", fontSize: "0.8rem", color: "#FFF", fontFamily: "monospace", resize: "vertical" }}
                                value={draft.body || ""}
                                onChange={(e) => {
                                  const updatedDraft = { ...draft, body: e.target.value };
                                  setAgentTasks(prev => prev.map(t => t.id === task.id ? { ...t, draft_data: updatedDraft } : t));
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: "0.8rem" }}>
                            <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "6px", marginBottom: "8px" }}>
                              <strong>Subject:</strong> {draft.subject}
                            </div>
                            <div style={{ 
                              background: "rgba(0,0,0,0.15)", 
                              padding: "10px", 
                              borderRadius: "6px", 
                              fontFamily: "monospace", 
                              whiteSpace: "pre-wrap", 
                              maxHeight: "150px", 
                              overflowY: "auto" 
                            }}>
                              {draft.body}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeAgentTab === "memories" && (
          <div className="premium-card">
            <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "16px" }}>Contextual Memory Registry</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "20px" }}>
              AI tracks objections, pain points, and customer constraints dynamically to personalize conversations.
            </p>

            {agentMemories.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "24px" }}>
                No memory context logs captured yet. Memory registry is updated as qualifying and outreach loops run.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                      <th style={{ padding: "12px 8px", color: "var(--text-muted)" }}>Lead</th>
                      <th style={{ padding: "12px 8px", color: "var(--text-muted)" }}>Memory Type</th>
                      <th style={{ padding: "12px 8px", color: "var(--text-muted)" }}>Content Summary</th>
                      <th style={{ padding: "12px 8px", color: "var(--text-muted)" }}>Captured Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentMemories.map((mem) => {
                      const lead = leads.find(l => l.id === mem.lead_id) || {};
                      return (
                        <tr key={mem.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "12px 8px", fontWeight: "600" }}>{lead.name || "Prospect"}</td>
                          <td style={{ padding: "12px 8px" }}>
                            <span style={{ 
                              padding: "2px 6px", 
                              borderRadius: "4px", 
                              fontSize: "0.7rem", 
                              fontWeight: "600",
                              background: mem.memory_type === "pain_point" ? "rgba(220,38,38,0.1)" : "rgba(255,255,255,0.05)",
                              color: mem.memory_type === "pain_point" ? "#ff8b8b" : "var(--text-primary)"
                            }}>
                              {mem.memory_type.replace("_", " ").toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: "12px 8px", color: "var(--text-secondary)" }}>{mem.content}</td>
                          <td style={{ padding: "12px 8px", color: "var(--text-muted)" }}>{mem.created_at ? mem.created_at.split("T")[0] : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // 14. CAMPAIGN CENTER (PHASE 6 NEW TAB)
  const renderCampaignCenter = () => {
    const analytics = getCampaignAnalytics();
    
    // CRM Score Filter ranges: Hot >= 80, Warm >= 50, Cold < 50
    const getFilteredBuilderLeads = () => {
      return leads.filter(l => {
        if (!l.email) return false;
        
        const score = Number(l.ai_score !== undefined ? l.ai_score : l.score) || 0;
        let matchesScore = true;
        if (crmScoreFilter === "Hot") {
          matchesScore = score >= 80;
        } else if (crmScoreFilter === "Warm") {
          matchesScore = score >= 50 && score < 80;
        } else if (crmScoreFilter === "Cold") {
          matchesScore = score < 50;
        }

        const query = searchLeadQuery.toLowerCase();
        const matchesQuery =
          l.name.toLowerCase().includes(query) ||
          l.email.toLowerCase().includes(query) ||
          (l.company && l.company.toLowerCase().includes(query));

        return matchesScore && matchesQuery;
      });
    };

    const activeSeq = sequences.find(s => s.id === activeSeqId) || sequences[0];

    // Build trend chart data
    const getTrendChartData = () => {
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.push(d.toISOString().split("T")[0]);
      }

      const opensByDate = {};
      const clicksByDate = {};
      last7Days.forEach(date => {
        opensByDate[date] = 0;
        clicksByDate[date] = 0;
      });

      campaignEvents.forEach(e => {
        if (!e.created_at) return;
        const dateStr = e.created_at.split("T")[0];
        if (opensByDate[dateStr] !== undefined) {
          if (e.event_type === "opened") opensByDate[dateStr]++;
          if (e.event_type === "clicked") clicksByDate[dateStr]++;
        }
      });

      return {
        labels: last7Days.map(d => d.substring(5)), // MM-DD
        opens: last7Days.map(date => opensByDate[date]),
        clicks: last7Days.map(date => clicksByDate[date])
      };
    };

    const trendData = getTrendChartData();
    const maxVal = Math.max(...trendData.opens, ...trendData.clicks, 5);
    const width = 500;
    const height = 150;
    const padding = 20;

    const getSvgPoints = (points) => {
      return points.map((p, idx) => {
        const x = padding + (idx * (width - 2 * padding) / 6);
        const y = height - padding - (p * (height - 2 * padding) / maxVal);
        return `${x},${y}`;
      }).join(" ");
    };

    const opensPathPoints = getSvgPoints(trendData.opens);
    const clicksPathPoints = getSvgPoints(trendData.clicks);

    // Interpolate subject & body for preview modal
    const getPreviewHtml = () => {
      let previewSubject = campaignSubject || "Elevate AI Outreach";
      let previewBody = campaignBody || "<p>Provide email copy by generating or typing in the builder.</p>";
      let leadName = "John Doe";
      let leadCompany = "Acme Corp";

      if (selectedLeadIds.length > 0) {
        const firstLead = leads.find(l => l.id === selectedLeadIds[0]);
        if (firstLead) {
          leadName = firstLead.name;
          leadCompany = firstLead.company || "your business";
        }
      }

      const interpolate = (text) => {
        if (!text) return "";
        return text
          .replace(/\{\{name\}\}/g, leadName)
          .replace(/\{\{company\}\}/g, leadCompany);
      };

      return {
        subject: interpolate(previewSubject),
        body: interpolate(previewBody)
      };
    };

    const previewData = getPreviewHtml();

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Campaign Center Subtabs */}
        <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
          <button 
            className={`btn btn-sm ${activeCampaignTab === "dashboard" ? "btn-gold" : "btn-secondary"}`}
            onClick={() => setActiveCampaignTab("dashboard")}
          >
            Campaign Dashboard
          </button>
          <button 
            className={`btn btn-sm ${activeCampaignTab === "builder" ? "btn-gold" : "btn-secondary"}`}
            onClick={() => setActiveCampaignTab("builder")}
          >
            Campaign Builder
          </button>
          <button 
            className={`btn btn-sm ${activeCampaignTab === "sequences" ? "btn-gold" : "btn-secondary"}`}
            onClick={() => setActiveCampaignTab("sequences")}
          >
            Sequence Builder
          </button>
        </div>

        {activeCampaignTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {/* KPI Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
              <div className="premium-card" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.05em" }}>Campaigns</span>
                <h4 style={{ fontSize: "1.75rem", color: "var(--accent-gold)", marginTop: "8px", fontWeight: "700" }}>{campaigns.filter(c => !c.deleted_at).length}</h4>
              </div>
              <div className="premium-card" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.05em" }}>Emails Sent</span>
                <h4 style={{ fontSize: "1.75rem", color: "var(--text-primary)", marginTop: "8px", fontWeight: "700" }}>{analytics.totalSent}</h4>
              </div>
              <div className="premium-card" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.05em" }}>Open Rate</span>
                <h4 style={{ fontSize: "1.75rem", color: "var(--accent-emerald)", marginTop: "8px", fontWeight: "700" }}>{analytics.openRate.toFixed(1)}%</h4>
              </div>
              <div className="premium-card" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.05em" }}>Click Rate</span>
                <h4 style={{ fontSize: "1.75rem", color: "var(--accent-gold)", marginTop: "8px", fontWeight: "700" }}>{analytics.clickRate.toFixed(1)}%</h4>
              </div>
              <div className="premium-card" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.05em" }}>Reply Rate</span>
                <h4 style={{ fontSize: "1.75rem", color: "#60A5FA", marginTop: "8px", fontWeight: "700" }}>{analytics.replyRate.toFixed(1)}%</h4>
              </div>
              <div className="premium-card" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600", letterSpacing: "0.05em" }}>Won Revenue</span>
                <h4 style={{ fontSize: "1.75rem", color: "var(--accent-emerald)", marginTop: "8px", fontWeight: "700" }}>${analytics.revenueGenerated.toLocaleString()}</h4>
              </div>
            </div>

            {/* SVG Trend Chart & Quick Insight Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px" }}>
              <div className="premium-card" style={{ padding: "24px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "16px" }}>7-Day Engagement Trend</h3>
                <div style={{ position: "relative", width: "100%", height: "180px", background: "rgba(0,0,0,0.15)", borderRadius: "8px", padding: "10px", border: "1px solid var(--border-color)" }}>
                  <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "100%" }}>
                    <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                    <line x1={padding} y1={(height) / 2} x2={width - padding} y2={(height) / 2} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />

                    <polyline fill="none" stroke="var(--accent-emerald)" strokeWidth={3} strokeLinecap="round" points={opensPathPoints} />
                    <polyline fill="none" stroke="var(--accent-gold)" strokeWidth={3} strokeLinecap="round" points={clicksPathPoints} strokeDasharray="4,4" />

                    {trendData.labels.map((lbl, idx) => {
                      const x = padding + (idx * (width - 2 * padding) / 6);
                      const openVal = trendData.opens[idx];
                      const clickVal = trendData.clicks[idx];
                      const yOpen = height - padding - (openVal * (height - 2 * padding) / maxVal);
                      const yClick = height - padding - (clickVal * (height - 2 * padding) / maxVal);

                      return (
                        <g key={idx}>
                          <circle cx={x} cy={yOpen} r={4} fill="var(--accent-emerald)" />
                          <circle cx={x} cy={yClick} r={4} fill="var(--accent-gold)" />
                          <text x={x} y={height - 5} fill="var(--text-muted)" fontSize={8} textAnchor="middle">{lbl}</text>
                        </g>
                      );
                    })}
                  </svg>
                  <div style={{ display: "flex", gap: "16px", marginTop: "12px", justifyContent: "center", fontSize: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ display: "inline-block", width: "12px", height: "4px", backgroundColor: "var(--accent-emerald)", borderRadius: "2px" }} />
                      <span style={{ color: "var(--text-secondary)" }}>Emails Opened</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ display: "inline-block", width: "12px", height: "4px", backgroundColor: "var(--accent-gold)", borderRadius: "2px" }} />
                      <span style={{ color: "var(--text-secondary)" }}>Link Clicks</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="premium-card" style={{ padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "12px", color: "var(--accent-gold)" }}>AI Campaign Co-Pilot</h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                    {analytics.totalSent === 0 ? (
                      "Your pipeline is ready for outreach! Build your template, select highly engaged Hot leads (CRM score > 80), and launch your sequence to drive new deal conversions."
                    ) : analytics.replyRate < 15 ? (
                      "Target reply rate is under 15%. Consider optimizing your value proposition or creating a 'Warm' segment campaign to test alternative calls-to-action."
                    ) : (
                      "Outbound campaigns are delivering solid performance. Tap 'Campaign Builder' to test a professional vs casual tone for upcoming batches."
                    )}
                  </p>
                </div>
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  <span>Sender status: <strong style={{ color: "var(--accent-emerald)" }}>Simulation / Resend Active</strong></span>
                  <span>CRM Connected</span>
                </div>
              </div>
            </div>

            {/* Active Campaigns Table */}
            <div className="premium-card" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "16px" }}>Active Campaign Registry</h3>
              {campaigns.filter(c => !c.deleted_at).length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "24px" }}>
                  No outreach campaigns created yet. Click "Campaign Builder" tab to launch your first sequence campaign!
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                        <th style={{ padding: "12px 8px", color: "var(--text-muted)" }}>Campaign Name</th>
                        <th style={{ padding: "12px 8px", color: "var(--text-muted)" }}>Status</th>
                        <th style={{ padding: "12px 8px", color: "var(--text-muted)", textAlign: "center" }}>Recipients</th>
                        <th style={{ padding: "12px 8px", color: "var(--text-muted)", textAlign: "center" }}>Open Rate</th>
                        <th style={{ padding: "12px 8px", color: "var(--text-muted)", textAlign: "center" }}>Click Rate</th>
                        <th style={{ padding: "12px 8px", color: "var(--text-muted)", textAlign: "center" }}>Reply Rate</th>
                        <th style={{ padding: "12px 8px", color: "var(--text-muted)", textAlign: "center" }}>Bounce Rate</th>
                        <th style={{ padding: "12px 8px", color: "var(--text-muted)" }}>Created Date</th>
                        <th style={{ padding: "12px 8px", color: "var(--text-muted)", textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.filter(c => !c.deleted_at).map((camp) => {
                        const campOpenRate = camp.sent_count > 0 ? ((camp.open_count / camp.sent_count) * 100).toFixed(1) + "%" : "0.0%";
                        const campClickRate = camp.sent_count > 0 ? ((camp.click_count / camp.sent_count) * 100).toFixed(1) + "%" : "0.0%";
                        const campReplyRate = camp.sent_count > 0 ? ((camp.reply_count / camp.sent_count) * 100).toFixed(1) + "%" : "0.0%";
                        const campBounceRate = camp.sent_count > 0 ? ((camp.bounce_count / camp.sent_count) * 100).toFixed(1) + "%" : "0.0%";

                        const statusColors = {
                          draft: { bg: "rgba(255,255,255,0.06)", text: "var(--text-muted)" },
                          scheduled: { bg: "rgba(96,165,250,0.12)", text: "#60A5FA" },
                          paused: { bg: "rgba(239,68,68,0.12)", text: "#F87171" },
                          sending: { bg: "rgba(214,178,74,0.12)", text: "var(--accent-gold)" },
                          sent: { bg: "rgba(109,201,165,0.12)", text: "var(--accent-emerald)" },
                          completed: { bg: "rgba(16,185,129,0.12)", text: "#34D399" },
                          failed: { bg: "rgba(239,68,68,0.12)", text: "#EF4444" }
                        };
                        const badgeStyle = statusColors[camp.status] || { bg: "rgba(255,255,255,0.05)", text: "#fff" };

                        return (
                          <tr key={camp.id} style={{ borderBottom: "1px solid var(--border-color)", verticalAlign: "middle" }}>
                            <td style={{ padding: "12px 8px", fontWeight: "600" }}>{camp.name}</td>
                            <td style={{ padding: "12px 8px" }}>
                              <span style={{ 
                                padding: "2px 8px", 
                                borderRadius: "10px", 
                                fontSize: "0.7rem", 
                                fontWeight: "600",
                                background: badgeStyle.bg,
                                color: badgeStyle.text
                              }}>
                                {camp.status.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: "12px 8px", textAlign: "center" }}>{camp.total_leads}</td>
                            <td style={{ padding: "12px 8px", textAlign: "center" }}>{campOpenRate}</td>
                            <td style={{ padding: "12px 8px", textAlign: "center" }}>{campClickRate}</td>
                            <td style={{ padding: "12px 8px", textAlign: "center" }}>{campReplyRate}</td>
                            <td style={{ padding: "12px 8px", textAlign: "center" }}>{campBounceRate}</td>
                            <td style={{ padding: "12px 8px", color: "var(--text-muted)" }}>{camp.created_at ? camp.created_at.split("T")[0] : ""}</td>
                            <td style={{ padding: "12px 8px", textAlign: "right" }}>
                              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" }}>
                                {camp.status === "draft" && (
                                  <button 
                                    className="btn btn-emerald btn-sm"
                                    style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                                    onClick={async () => {
                                      if (!hasPermission(organizationRole, PERMISSIONS.SEND_CAMPAIGNS)) {
                                        alert("Forbidden: Sales Reps and Viewers cannot launch/send campaigns.");
                                        return;
                                      }
                                      try {
                                        await sendCampaign(camp.id);
                                        alert("Campaign launched successfully!");
                                      } catch (err) {
                                        alert("Send failed: " + err.message);
                                      }
                                    }}
                                    disabled={!hasPermission(organizationRole, PERMISSIONS.SEND_CAMPAIGNS)}
                                  >
                                    Launch
                                  </button>
                                )}
                                {camp.status === "sending" && (
                                  <button 
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                                    onClick={async () => {
                                      try {
                                        await updateCampaign(camp.id, { status: "paused" });
                                        alert("Campaign paused.");
                                      } catch (err) {
                                        alert("Failed to pause: " + err.message);
                                      }
                                    }}
                                  >
                                    Pause
                                  </button>
                                )}
                                {camp.status === "paused" && (
                                  <button 
                                    className="btn btn-emerald btn-sm"
                                    style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                                    onClick={async () => {
                                      if (!hasPermission(organizationRole, PERMISSIONS.SEND_CAMPAIGNS)) {
                                        alert("Forbidden: Sales Reps and Viewers cannot launch/send campaigns.");
                                        return;
                                      }
                                      try {
                                        await updateCampaign(camp.id, { status: "sending" });
                                        await sendCampaign(camp.id);
                                      } catch (err) {
                                        alert("Failed to resume: " + err.message);
                                      }
                                    }}
                                    disabled={!hasPermission(organizationRole, PERMISSIONS.SEND_CAMPAIGNS)}
                                  >
                                    Resume
                                  </button>
                                )}
                                <button 
                                  className="btn btn-sm"
                                  style={{ padding: "4px 8px", fontSize: "0.75rem", background: "transparent", color: "var(--accent-gold)" }}
                                  onClick={async () => {
                                    if (confirm("Are you sure you want to delete this campaign?")) {
                                      try {
                                        await deleteCampaign(camp.id);
                                      } catch (err) {
                                        alert("Failed to delete campaign: " + err.message);
                                      }
                                    }
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeCampaignTab === "builder" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
            {/* Left Side: Campaign Configuration Form */}
            <div className="premium-card" style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "24px" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--accent-gold)" }}>Outbound Campaign Configuration</h3>
              
              <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label className="form-label" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Campaign Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", padding: "10px", borderRadius: "6px", color: "#FFF" }}
                  placeholder="E.g. Q3 Growth Acceleration Outreach"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label className="form-label" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Campaign Objective / Goal</label>
                <textarea 
                  className="form-input" 
                  rows={2}
                  style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", padding: "10px", borderRadius: "6px", color: "#FFF", resize: "vertical" }}
                  placeholder="E.g. Book a discovery call to check if they want to integrate CRM solutions."
                  value={campaignGoal}
                  onChange={(e) => setCampaignGoal(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label className="form-label" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Target Audience</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", padding: "10px", borderRadius: "6px", color: "#FFF" }}
                  placeholder="E.g. B2B Sales Managers at Medium SaaS organizations"
                  value={campaignAudience}
                  onChange={(e) => setCampaignAudience(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label className="form-label" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Core Offer / Value Proposition</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", padding: "10px", borderRadius: "6px", color: "#FFF" }}
                  placeholder="E.g. 14-day free trial + custom CRM migration checklist setup"
                  value={campaignOffer}
                  onChange={(e) => setCampaignOffer(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label className="form-label" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Writing Tone</label>
                <select 
                  className="form-input" 
                  style={{ background: "#0a0a0a", border: "1px solid var(--border-color)", padding: "10px", borderRadius: "6px", color: "#FFF" }}
                  value={campaignTone}
                  onChange={(e) => setCampaignTone(e.target.value)}
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="friendly">Friendly</option>
                  <option value="bold">Bold & Direct</option>
                </select>
              </div>

              <button 
                className="btn btn-gold"
                style={{ width: "100%", marginTop: "10px" }}
                onClick={handleGenerateAI}
                disabled={isGenerating || !hasPermission(organizationRole, PERMISSIONS.CREATE_CAMPAIGNS)}
              >
                {isGenerating ? "AI Copywriter Structuring Template..." : "Generate Template with AI"}
              </button>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px", marginTop: "8px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <h4 style={{ fontSize: "0.9rem", fontWeight: "600" }}>Generated Outreach Email Template</h4>
                
                <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Subject</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", padding: "8px", borderRadius: "6px", fontSize: "0.8rem", color: "#FFF" }}
                    placeholder="Subject line will appear here..."
                    value={campaignSubject}
                    onChange={(e) => setCampaignSubject(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Email Body (HTML supported)</label>
                  <textarea 
                    className="form-input" 
                    rows={6}
                    style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", padding: "10px", borderRadius: "6px", fontSize: "0.8rem", color: "#FFF", fontFamily: "monospace", resize: "vertical" }}
                    placeholder="HTML body will appear here..."
                    value={campaignBody}
                    onChange={(e) => setCampaignBody(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button 
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setIsPreviewOpen(true)}
                  disabled={!campaignSubject || !campaignBody}
                >
                  Preview
                </button>
                <button 
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={handleSaveDraft}
                  disabled={isSending || !campaignName || selectedLeadIds.length === 0}
                >
                  Save Draft
                </button>
                <button 
                  className="btn btn-gold"
                  style={{ flex: 2, ...(!hasPermission(organizationRole, PERMISSIONS.SEND_CAMPAIGNS) ? { opacity: 0.45, cursor: "not-allowed" } : {}) }}
                  onClick={handleLaunchCampaign}
                  disabled={isSending || !hasPermission(organizationRole, PERMISSIONS.SEND_CAMPAIGNS) || !campaignName || selectedLeadIds.length === 0}
                  title={!hasPermission(organizationRole, PERMISSIONS.SEND_CAMPAIGNS) ? "Forbidden: Sales Reps cannot send campaigns." : undefined}
                >
                  {isSending ? "Launching..." : "Launch Campaign"}
                </button>
              </div>
            </div>

            {/* Right Side: Lead Selector Panel */}
            <div className="premium-card" style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "600" }}>Recipient Selector ({selectedLeadIds.length} chosen)</h3>
                <button 
                  className="btn btn-secondary btn-sm"
                  style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                  onClick={() => {
                    const availableIds = getFilteredBuilderLeads().map(l => l.id);
                    const allSelected = availableIds.every(id => selectedLeadIds.includes(id));
                    if (allSelected) {
                      setSelectedLeadIds(prev => prev.filter(id => !availableIds.includes(id)));
                    } else {
                      setSelectedLeadIds(prev => [...new Set([...prev, ...availableIds])]);
                    }
                  }}
                >
                  Toggle Filtered
                </button>
              </div>

              {/* CRM Score Range Filter Buttons */}
              <div style={{ display: "flex", gap: "8px" }}>
                {["All", "Hot", "Warm", "Cold"].map((scoreCat) => {
                  const isActive = crmScoreFilter === scoreCat;
                  return (
                    <button
                      key={scoreCat}
                      type="button"
                      className={`btn btn-sm ${isActive ? "btn-gold" : "btn-secondary"}`}
                      style={{ flex: 1, padding: "6px", fontSize: "0.75rem" }}
                      onClick={() => setCrmScoreFilter(scoreCat)}
                    >
                      {scoreCat === "All" ? "All Scores" : scoreCat === "Hot" ? "🔥 Hot (>=80)" : scoreCat === "Warm" ? "⚡ Warm (50-79)" : "❄️ Cold (<50)"}
                    </button>
                  );
                })}
              </div>

              <input 
                type="text" 
                className="form-input" 
                style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", padding: "10px", borderRadius: "6px", fontSize: "0.8rem", color: "#FFF" }}
                placeholder="Search leads by name, email or company..."
                value={searchLeadQuery}
                onChange={(e) => setSearchLeadQuery(e.target.value)}
              />

              {/* Leads List Box */}
              <div style={{ flexGrow: 1, maxHeight: "400px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(0,0,0,0.15)" }}>
                {getFilteredBuilderLeads().length === 0 ? (
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", padding: "24px", fontStyle: "italic" }}>No matching leads with emails.</p>
                ) : (
                  getFilteredBuilderLeads().map((lead) => {
                    const score = Number(lead.ai_score !== undefined ? lead.ai_score : lead.score) || 0;
                    const isSelected = selectedLeadIds.includes(lead.id);
                    return (
                      <div 
                        key={lead.id} 
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "12px", 
                          padding: "12px", 
                          borderBottom: "1px solid var(--border-color)",
                          background: isSelected ? "rgba(214,178,74,0.04)" : "transparent",
                          transition: "background 0.2s"
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => {
                            setSelectedLeadIds(prev => 
                              prev.includes(lead.id) ? prev.filter(id => id !== lead.id) : [...prev, lead.id]
                            );
                          }}
                          style={{ cursor: "pointer" }}
                        />
                        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, overflow: "hidden" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#FFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.name}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.email} {lead.company ? `• ${lead.company}` : ""}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ 
                            fontSize: "0.7rem", 
                            fontWeight: "700",
                            color: score >= 80 ? "var(--accent-emerald)" : score >= 50 ? "var(--accent-gold)" : "var(--text-muted)"
                          }}>
                            Score: {score}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeCampaignTab === "sequences" && (
          <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "24px" }}>
            {/* Left Column: List of sequences & Generation form */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* AI Sequence Generation Form */}
              <div className="premium-card" style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "24px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--accent-gold)" }}>AI Sequence Architect</h3>
                
                <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Sequence Name</label>
                  <input 
                    type="text" 
                    className="form-input"
                    style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", padding: "8px", borderRadius: "6px", color: "#FFF" }}
                    placeholder="E.g. Inactive Client Reactivation"
                    value={seqName}
                    onChange={(e) => setSeqName(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Target Strategy & Goals</label>
                  <textarea 
                    className="form-input"
                    rows={2}
                    style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", padding: "8px", borderRadius: "6px", color: "#FFF", resize: "vertical" }}
                    placeholder="E.g. Day 1 introduction email, Day 3 whatsapp text value offer, Day 7 follow-up call script hook."
                    value={seqGoal}
                    onChange={(e) => setSeqGoal(e.target.value)}
                  />
                </div>

                <button 
                  className="btn btn-gold btn-sm" 
                  style={{ width: "100%", ...(!hasPermission(organizationRole, PERMISSIONS.CREATE_CAMPAIGNS) ? { opacity: 0.45, cursor: "not-allowed" } : {}) }}
                  onClick={handleGenerateSeq}
                  disabled={isGeneratingSeq || !hasPermission(organizationRole, PERMISSIONS.CREATE_CAMPAIGNS)}
                  title={!hasPermission(organizationRole, PERMISSIONS.CREATE_CAMPAIGNS) ? `Role: ${organizationRole} is not permitted to create sequences.` : undefined}
                >
                  {isGeneratingSeq ? "Architecting Sales Steps..." : "Generate AI Sales Sequence"}
                </button>
              </div>

              {/* Saved Sequences List */}
              <div className="premium-card" style={{ padding: "24px" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "16px" }}>Saved Outreach Sequences</h3>
                {sequences.length === 0 ? (
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center" }}>No sequences architected yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {sequences.map((seq) => {
                      const isSelected = activeSeqId === seq.id || (activeSeqId === null && activeSeq?.id === seq.id);
                      return (
                        <div 
                          key={seq.id}
                          style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "space-between", 
                            padding: "12px", 
                            background: isSelected ? "rgba(214,178,74,0.05)" : "rgba(255,255,255,0.02)",
                            border: isSelected ? "1px solid var(--accent-gold)" : "1px solid var(--border-color)",
                            borderRadius: "8px"
                          }}
                        >
                          <div 
                            style={{ flexGrow: 1, cursor: "pointer" }}
                            onClick={() => setActiveSeqId(seq.id)}
                          >
                            <h5 style={{ fontSize: "0.85rem", fontWeight: "600" }}>{seq.name}</h5>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{seq.steps?.length || 0} step outreach flow</span>
                          </div>

                          {/* Active switch */}
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "0.7rem", color: seq.active ? "var(--accent-emerald)" : "var(--text-muted)" }}>
                              {seq.active ? "Active" : "Inactive"}
                            </span>
                            <label className="switch" style={{ position: "relative", display: "inline-block", width: "32px", height: "18px" }}>
                              <input 
                                type="checkbox" 
                                checked={seq.active} 
                                onChange={() => toggleSequenceActive(seq.id, seq.active)}
                                style={{ opacity: 0, width: 0, height: 0 }}
                              />
                              <span style={{ 
                                position: "absolute", 
                                cursor: "pointer", 
                                top: 0, left: 0, right: 0, bottom: 0, 
                                backgroundColor: seq.active ? "var(--accent-emerald)" : "#444",
                                transition: "0.4s",
                                borderRadius: "18px"
                              }}>
                                <span style={{ 
                                  position: "absolute", 
                                  content: "''", 
                                  height: "12px", width: "12px", 
                                  left: seq.active ? "16px" : "3px", bottom: "3px", 
                                  backgroundColor: "#0A0A0A", 
                                  transition: "0.4s",
                                  borderRadius: "50%" 
                                }}></span>
                              </span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Visual timeline of sequence steps */}
            <div className="premium-card" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "20px" }}>Sequence Flow Visualizer</h3>
              
              {!activeSeq ? (
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", paddingTop: "40px" }}>
                  Select or generate an AI Sequence on the left to visualize its multi-channel strategy.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
                    <h4 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--accent-gold)" }}>{activeSeq.name}</h4>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                      Realtime automation triggers this sequence for targets systematically.
                    </p>
                  </div>

                  {/* Vertical Timeline container */}
                  <div style={{ position: "relative", paddingLeft: "30px", display: "flex", flexDirection: "column", gap: "24px", marginTop: "10px" }}>
                    {/* Visual Vertical line */}
                    <div style={{ 
                      position: "absolute", 
                      left: "11px", 
                      top: "10px", 
                      bottom: "10px", 
                      width: "2px", 
                      background: "linear-gradient(180deg, var(--accent-gold), rgba(255,255,255,0.05))" 
                    }} />

                    {activeSeq.steps && Array.isArray(activeSeq.steps) ? (
                      activeSeq.steps.map((step, idx) => (
                        <div key={idx} style={{ position: "relative" }}>
                          {/* Dot marker */}
                          <div style={{ 
                            position: "absolute", 
                            left: "-25px", 
                            top: "4px", 
                            width: "12px", 
                            height: "12px", 
                            borderRadius: "50%", 
                            background: step.type === "email" ? "var(--accent-gold)" : "var(--accent-emerald)",
                            border: "2px solid #060606",
                            boxShadow: step.type === "email" ? "0 0 6px var(--accent-gold-glow)" : "0 0 6px var(--accent-emerald-glow)"
                          }} />

                          {/* Node Card */}
                          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "14px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                              <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--accent-gold)" }}>Trigger: Day {step.day}</span>
                              <span style={{ 
                                fontSize: "0.7rem", 
                                padding: "2px 6px", 
                                borderRadius: "4px", 
                                fontWeight: "600",
                                background: step.type === "email" ? "rgba(214,178,74,0.1)" : "rgba(109,201,165,0.1)",
                                color: step.type === "email" ? "var(--accent-gold)" : "var(--accent-emerald)",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px"
                              }}>
                                {step.type === "email" ? <Mail size={10} /> : <MessageSquare size={10} />}
                                {step.type.toUpperCase()}
                              </span>
                            </div>
                            <div style={{ 
                              fontSize: "0.8rem", 
                              color: "var(--text-secondary)", 
                              lineHeight: "1.4", 
                              background: "rgba(0,0,0,0.15)", 
                              padding: "10px", 
                              borderRadius: "6px",
                              fontFamily: "monospace",
                              whiteSpace: "pre-wrap",
                              maxHeight: "150px",
                              overflowY: "auto"
                            }}>
                              {step.content}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No steps configured in this sequence.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Email Preview Modal Overlay */}
        {isPreviewOpen && (
          <div style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: "20px"
          }}>
            <div className="premium-card" style={{
              width: "100%",
              maxWidth: "600px",
              background: "#0c0c0c",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--accent-gold)" }}>Outreach Email Preview</h3>
                <button 
                  onClick={() => setIsPreviewOpen(false)}
                  style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "1.2rem", cursor: "pointer" }}
                >
                  &times;
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.85rem", background: "rgba(0,0,0,0.2)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Subject: </span>
                  <strong style={{ color: "#fff" }}>{previewData.subject}</strong>
                </div>
                <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", margin: "8px 0" }} />
                <div style={{ color: "var(--text-secondary)", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                  <div dangerouslySetInnerHTML={{ __html: previewData.body }} />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                <span>Note: placeholders like <code style={{ color: "var(--accent-gold)" }}>{"{{name}}"}</code> and <code style={{ color: "var(--accent-gold)" }}>{"{{company}}"}</code> are dynamically replaced per recipient.</span>
                <button className="btn btn-gold btn-sm" onClick={() => setIsPreviewOpen(false)}>Close Preview</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFollowupCenter = () => {
    const activeSeqs = followupSequences.filter(s => s.active).length;
    const scheduledEmails = followupExecutions.filter(e => e.status === "scheduled" || e.status === "pending").length;
    const repliesReceived = followupExecutions.filter(e => e.status === "replied").length;
    
    const leadIdsInFollowups = new Set(followupExecutions.map(e => e.lead_id));
    const meetingsBooked = appointments.filter(a => 
      leadIdsInFollowups.has(a.lead_id) && 
      ["confirmed", "completed"].includes(String(a.status).toLowerCase())
    ).length;

    const totalUniqueLeads = leadIdsInFollowups.size;
    const conversionRate = totalUniqueLeads > 0 
      ? (((repliesReceived + meetingsBooked) / totalUniqueLeads) * 100).toFixed(1)
      : "0.0";

    const wonDealsInFollowups = deals.filter(d => 
      leadIdsInFollowups.has(d.lead_id) && 
      (d.stage === "Won" || d.status === "won" || d.stage === "Closed Won")
    );
    const revenueInfluenced = wonDealsInFollowups.reduce((acc, d) => acc + (Number(d.value) || 0), 0);

    const getAiInsights = () => {
      const sentCount = followupExecutions.filter(e => e.status === "sent").length;
      if (sentCount === 0) {
        return "No execution data yet. Once emails are sent and tracked, AI will generate copy optimization insights here.";
      }
      
      const replyRateNum = Number(conversionRate);

      if (replyRateNum < 15) {
        return "⚠️ High Outreach Volume but Low Replies: Your CTA might be too weak. Try editing your 'Meeting Request' or 'Breakup' template CTA to ask a low-friction question rather than scheduling links directly.";
      } else if (replyRateNum >= 15 && meetingsBooked === 0) {
        return "⚡ High Replies with Low Meetings: Prospects are engaging but not converting to calendar briefs. Consider embedding a scheduling snippet or clarifying the value of the discovery call.";
      } else {
        return "👑 Optimal Performance: Sequences are maintaining healthy engagement levels. Subject line open rates are above industry benchmarks (45%). Keep monitoring response rates.";
      }
    };

    const renderTrendChart = () => {
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.push(d.toISOString().split("T")[0]);
      }

      const sentsByDate = {};
      const repliesByDate = {};
      last7Days.forEach(date => {
        sentsByDate[date] = 0;
        repliesByDate[date] = 0;
      });

      followupExecutions.forEach(e => {
        if (!e.created_at) return;
        const dateStr = e.created_at.split("T")[0];
        if (sentsByDate[dateStr] !== undefined) {
          if (e.status === "sent" || e.status === "waiting_reply") sentsByDate[dateStr]++;
          if (e.status === "replied") repliesByDate[dateStr]++;
        }
      });

      const labels = last7Days.map(d => d.substring(5));
      const sents = last7Days.map(date => sentsByDate[date]);
      const reps = last7Days.map(date => repliesByDate[date]);

      const maxVal = Math.max(...sents, ...reps, 5);
      const width = 500;
      const height = 150;
      const padding = 20;

      const getSvgPoints = (points) => {
        return points.map((p, idx) => {
          const x = padding + (idx * (width - 2 * padding) / 6);
          const y = height - padding - (p * (height - 2 * padding) / maxVal);
          return `${x},${y}`;
        }).join(" ");
      };

      return (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "20px" }}>
          <h4 style={{ fontSize: "0.9rem", fontWeight: "600", marginBottom: "16px" }}>Outbound Trend Telemetry (Opens vs Responses)</h4>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto" }}>
            {[0, 1, 2, 3].map((g) => {
              const y = padding + (g * (height - 2 * padding) / 3);
              return <line key={g} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />;
            })}
            
            <polyline fill="none" stroke="var(--accent-gold)" strokeWidth="2.5" points={getSvgPoints(sents)} />
            <polyline fill="none" stroke="var(--accent-emerald)" strokeWidth="2.5" points={getSvgPoints(reps)} />
            
            {labels.map((lbl, idx) => {
              const x = padding + (idx * (width - 2 * padding) / 6);
              return (
                <text key={idx} x={x} y={height - 5} fill="var(--text-muted)" fontSize="9" textAnchor="middle">
                  {lbl}
                </text>
              );
            })}
          </svg>
          <div style={{ display: "flex", gap: "16px", marginTop: "12px", fontSize: "0.8rem", justifyContent: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "10px", height: "10px", backgroundColor: "var(--accent-gold)", borderRadius: "50%" }}></span>Emails Sent</span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "10px", height: "10px", backgroundColor: "var(--accent-emerald)", borderRadius: "50%" }}></span>Replies</span>
          </div>
        </div>
      );
    };

    const loadDefaultTemplate = () => {
      setFollowupSeqName("Default Outbound Outreach & Nurture");
      setFollowupSeqDescription("6-stage professional outbound sequence spanning 30 days.");
      setFollowupSeqSteps([
        { delay_days: 0, step_type: "initial", subject_template: "Outreach: Connecting regarding {{company}}", body_template: "<p>Hi {{name}},</p><p>I noticed that your team is managing CRM leads. Let's connect.</p>" },
        { delay_days: 3, step_type: "followup", subject_template: "Re: Connecting regarding {{company}}", body_template: "<p>Hi {{name}},</p><p>Just checking back. Do you have 5 mins for a brief chat?</p>" },
        { delay_days: 7, step_type: "followup", subject_template: "Value Checklist for {{company}}", body_template: "<p>Hi {{name}},</p><p>I wanted to send over a checklist of CRM tools. Let me know if this helps.</p>" },
        { delay_days: 14, step_type: "case_study", subject_template: "Case Study: Scaling outreach checklist", body_template: "<p>Hi {{name}},</p><p>We helped other SaaS teams scale conversion rates by 40%.</p>" },
        { delay_days: 21, step_type: "meeting_request", subject_template: "Brief call next week?", body_template: "<p>Hi {{name}},</p><p>Let's book a meeting on my calendar: <a href='#'>sync calendar</a>.</p>" },
        { delay_days: 30, step_type: "breakup", subject_template: "Permission to close file?", body_template: "<p>Hi {{name}},</p><p>Since I haven't heard back, I'm assuming now is not the right time. Best of luck!</p>" }
      ]);
    };

    const handleSaveSequence = async () => {
      if (!followupSeqName.trim()) {
        alert("Please enter a sequence name.");
        return;
      }
      try {
        await createFollowupSequence(followupSeqName, followupSeqDescription, followupSeqSteps);
        alert("Sequence created successfully!");
        setFollowupSeqName("");
        setFollowupSeqDescription("");
        setFollowupSeqSteps([{ delay_days: 0, step_type: "initial", subject_template: "", body_template: "" }]);
      } catch (err) {
        console.error(err);
      }
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
          <button 
            className={`btn btn-sm ${activeFollowupTab === "dashboard" ? "btn-gold" : "btn-secondary"}`}
            onClick={() => setActiveFollowupTab("dashboard")}
          >
            Follow-Up Dashboard
          </button>
          <button 
            className={`btn btn-sm ${activeFollowupTab === "builder" ? "btn-gold" : "btn-secondary"}`}
            onClick={() => setActiveFollowupTab("builder")}
          >
            Sequence Builder
          </button>
          <button 
            className={`btn btn-sm ${activeFollowupTab === "monitor" ? "btn-gold" : "btn-secondary"}`}
            onClick={() => setActiveFollowupTab("monitor")}
          >
            Execution Monitor
          </button>
        </div>

        {activeFollowupTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
              <div className="premium-card" style={{ padding: "20px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>Active Sequences</span>
                <h4 style={{ fontSize: "1.75rem", color: "var(--accent-gold)", marginTop: "8px", fontWeight: "700" }}>{activeSeqs}</h4>
              </div>
              <div className="premium-card" style={{ padding: "20px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>Scheduled Emails</span>
                <h4 style={{ fontSize: "1.75rem", color: "#FFF", marginTop: "8px", fontWeight: "700" }}>{scheduledEmails}</h4>
              </div>
              <div className="premium-card" style={{ padding: "20px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>Replies Received</span>
                <h4 style={{ fontSize: "1.75rem", color: "var(--accent-emerald)", marginTop: "8px", fontWeight: "700" }}>{repliesReceived}</h4>
              </div>
              <div className="premium-card" style={{ padding: "20px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>Meetings Booked</span>
                <h4 style={{ fontSize: "1.75rem", color: "var(--accent-gold)", marginTop: "8px", fontWeight: "700" }}>{meetingsBooked}</h4>
              </div>
              <div className="premium-card" style={{ padding: "20px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>Conversion Rate</span>
                <h4 style={{ fontSize: "1.75rem", color: "#60A5FA", marginTop: "8px", fontWeight: "700" }}>{conversionRate}%</h4>
              </div>
              <div className="premium-card" style={{ padding: "20px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "600" }}>Revenue Influenced</span>
                <h4 style={{ fontSize: "1.75rem", color: "var(--accent-emerald)", marginTop: "8px", fontWeight: "700" }}>${revenueInfluenced.toLocaleString()}</h4>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
              {renderTrendChart()}
              
              <div className="premium-card" style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "24px", border: "1px solid rgba(214,178,74,0.2)", background: "linear-gradient(135deg, rgba(214,178,74,0.03) 0%, rgba(0,0,0,0.5) 100%)" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--accent-gold)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Brain size={18} />
                  <span>AI Agent Follow-Up Insights</span>
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                  {getAiInsights()}
                </p>
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <strong style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Agent Action Rules</strong>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span>🔥 <strong>Lead is Hot:</strong> Auto-schedules Outreach Sequence</span>
                    <span>⚡ <strong>Lead is Warm:</strong> Auto-schedules Nurture Sequence</span>
                    <span>✨ <strong>Lead is Ready To Close:</strong> Auto-schedules Meeting Request Sequence</span>
                    <span>🎯 <strong>Lead replies or Deal is Won:</strong> Automatically terminates sequence</span>
                    <span>❄️ <strong>Cold Lead (No Activity 30 days):</strong> Launches Recovery Sequence</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeFollowupTab === "builder" && (
          <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: "24px" }}>
            <div className="premium-card" style={{ padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <strong style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>WORKFLOW SEQUENCES</strong>
                <button className="btn btn-secondary btn-sm" style={{ padding: "2px 6px", fontSize: "0.7rem" }} onClick={loadDefaultTemplate}>
                  Load Default
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {followupSequences.length === 0 ? (
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", fontStyle: "italic", textAlign: "center", padding: "12px" }}>
                    No sequences defined yet. Click Load Default or use the form on the right.
                  </p>
                ) : (
                  followupSequences.map(seq => (
                    <div 
                      key={seq.id} 
                      onClick={() => setSelectedFollowupSequenceId(seq.id)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        backgroundColor: selectedFollowupSequenceId === seq.id ? "rgba(197, 160, 40, 0.08)" : "rgba(255,255,255,0.02)",
                        border: selectedFollowupSequenceId === seq.id ? "1px solid var(--accent-gold)" : "1px solid var(--border-color)",
                        transition: "all 0.2s"
                      }}
                    >
                      <strong style={{ display: "block", fontSize: "0.8rem", color: "#fff" }}>{seq.name}</strong>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{followupSteps.filter(s => s.sequence_id === seq.id).length} steps</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="premium-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--accent-gold)" }}>Sequence Stage Editor</h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Sequence Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={followupSeqName} 
                    onChange={(e) => setFollowupSeqName(e.target.value)} 
                    placeholder="E.g. Hot Lead Closing Sequence"
                    style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", padding: "10px", borderRadius: "6px", color: "#FFF" }}
                  />
                </div>
                <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Description</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={followupSeqDescription} 
                    onChange={(e) => setFollowupSeqDescription(e.target.value)} 
                    placeholder="E.g. Triggers value pitch, case studies and breakup copy"
                    style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", padding: "10px", borderRadius: "6px", color: "#FFF" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <strong style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Workflow Steps</strong>
                {followupSeqSteps.map((step, idx) => (
                  <div key={idx} style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--accent-gold)" }}>Step #{idx + 1}</span>
                      {followupSeqSteps.length > 1 && (
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: "2px 8px", fontSize: "0.7rem", color: "#EF4444" }}
                          onClick={() => setFollowupSeqSteps(prev => prev.filter((_, i) => i !== idx))}
                        >
                          Delete Step
                        </button>
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Delay (Days)</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={step.delay_days}
                          onChange={(e) => {
                            const newSteps = [...followupSeqSteps];
                            newSteps[idx].delay_days = parseInt(e.target.value) || 0;
                            setFollowupSeqSteps(newSteps);
                          }}
                          style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", padding: "6px", borderRadius: "4px", color: "#FFF" }}
                        />
                      </div>
                      <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Step Type</label>
                        <select 
                          className="form-input"
                          value={step.step_type}
                          onChange={(e) => {
                            const newSteps = [...followupSeqSteps];
                            newSteps[idx].step_type = e.target.value;
                            setFollowupSeqSteps(newSteps);
                          }}
                          style={{ background: "#0a0a0a", border: "1px solid var(--border-color)", padding: "6px", borderRadius: "4px", color: "#FFF" }}
                        >
                          <option value="initial">Initial Outreach</option>
                          <option value="followup">Follow-Up</option>
                          <option value="case_study">Case Study Highlight</option>
                          <option value="meeting_request">Meeting Request</option>
                          <option value="breakup">Breakup Email</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Email Subject Template</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={step.subject_template}
                        onChange={(e) => {
                          const newSteps = [...followupSeqSteps];
                          newSteps[idx].subject_template = e.target.value;
                          setFollowupSeqSteps(newSteps);
                        }}
                        style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", padding: "6px", borderRadius: "4px", color: "#FFF" }}
                      />
                    </div>
                    <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Email Body Template (HTML)</label>
                      <textarea 
                        className="form-input" 
                        rows={3}
                        value={step.body_template}
                        onChange={(e) => {
                          const newSteps = [...followupSeqSteps];
                          newSteps[idx].body_template = e.target.value;
                          setFollowupSeqSteps(newSteps);
                        }}
                        style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", padding: "6px", borderRadius: "4px", color: "#FFF", fontFamily: "monospace" }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => setFollowupSeqSteps(prev => [...prev, { delay_days: 3, step_type: "followup", subject_template: "", body_template: "" }])}
                >
                  + Add Step
                </button>
                <button 
                  className="btn btn-gold" 
                  style={{ flex: 2 }}
                  onClick={handleSaveSequence}
                >
                  Save Sequence Template
                </button>
              </div>
            </div>
          </div>
        )}

        {activeFollowupTab === "monitor" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
            <div className="premium-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: "600" }}>Live Follow-Up Executions</h3>
                <select 
                  className="form-input" 
                  style={{ width: "150px", fontSize: "0.8rem", padding: "4px 8px", background: "#0a0a0a", border: "1px solid var(--border-color)", borderRadius: "4px" }}
                  value={followupStatusFilter}
                  onChange={(e) => setFollowupStatusFilter(e.target.value)}
                >
                  <option value="all">All Executions</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="sent">Sent</option>
                  <option value="waiting_reply">Waiting Reply</option>
                  <option value="replied">Replied</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Quick Schedule Test Panel */}
              {followupSequences.length > 0 && leads.length > 0 && (
                <div style={{ background: "rgba(109,201,165,0.06)", border: "1px solid rgba(109,201,165,0.2)", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--accent-emerald)" }}>
                      <Repeat size={12} style={{ marginRight: 6 }} />
                      Quick Schedule — Assign Sequence to Lead
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                    <select
                      className="form-input"
                      style={{ flex: 1, minWidth: "180px", fontSize: "0.8rem", padding: "6px 10px", background: "#0a0a0a", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#FFF" }}
                      value={monitorPickLeadId}
                      onChange={(e) => setMonitorPickLeadId(e.target.value)}
                    >
                      <option value="">— Select Lead —</option>
                      {leads.map(l => <option key={l.id} value={l.id}>{l.name} ({l.company || l.email})</option>)}
                    </select>
                    <select
                      className="form-input"
                      style={{ flex: 1, minWidth: "180px", fontSize: "0.8rem", padding: "6px 10px", background: "#0a0a0a", border: "1px solid var(--border-color)", borderRadius: "6px", color: "#FFF" }}
                      value={monitorPickSeqId}
                      onChange={(e) => setMonitorPickSeqId(e.target.value)}
                    >
                      <option value="">— Select Sequence —</option>
                      {followupSequences.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button
                      className="btn btn-gold btn-sm"
                      style={{ whiteSpace: "nowrap", padding: "6px 16px", fontSize: "0.8rem", fontWeight: "700" }}
                      disabled={!monitorPickLeadId || !monitorPickSeqId || isMonitorScheduling}
                      onClick={async () => {
                        if (!monitorPickLeadId || !monitorPickSeqId) return;
                        setIsMonitorScheduling(true);
                        try {
                          const seqSteps = followupSteps.filter(s => s.sequence_id === monitorPickSeqId).sort((a,b) => a.step_number - b.step_number);
                          if (!seqSteps || seqSteps.length === 0) {
                            alert("This sequence has no steps defined. Add steps first in Sequence Builder.");
                            return;
                          }
                          await scheduleFollowup(monitorPickLeadId, monitorPickSeqId);
                          setMonitorPickLeadId("");
                          setMonitorPickSeqId("");
                          alert(`✅ Sequence "${followupSequences.find(s=>s.id===monitorPickSeqId)?.name}" scheduled for lead! Check the table below.`);
                        } catch(err) {
                          alert("Error scheduling: " + err.message);
                        } finally {
                          setIsMonitorScheduling(false);
                        }
                      }}
                    >
                      {isMonitorScheduling ? "Scheduling..." : "▶ Schedule Now"}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                      <th style={{ padding: "12px 8px", color: "var(--text-muted)" }}>Lead</th>
                      <th style={{ padding: "12px 8px", color: "var(--text-muted)" }}>Sequence</th>
                      <th style={{ padding: "12px 8px", color: "var(--text-muted)" }}>Step</th>
                      <th style={{ padding: "12px 8px", color: "var(--text-muted)" }}>Scheduled</th>
                      <th style={{ padding: "12px 8px", color: "var(--text-muted)" }}>Status</th>
                      <th style={{ padding: "12px 8px", color: "var(--text-muted)" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {followupExecutions
                      .filter(exec => followupStatusFilter === "all" || exec.status === followupStatusFilter)
                      .map(exec => {
                        const targetLead = leads.find(l => l.id === exec.lead_id) || {};
                        const seq = followupSequences.find(s => s.id === exec.sequence_id) || {};
                        const step = followupSteps.find(s => s.id === exec.step_id) || {};
                        
                        return (
                          <tr 
                            key={exec.id} 
                            onClick={() => setSelectedLeadIdForTimeline(exec.lead_id)}
                            style={{ 
                              borderBottom: "1px solid var(--border-color)", 
                              cursor: "pointer", 
                              backgroundColor: selectedLeadIdForTimeline === exec.lead_id ? "rgba(255,255,255,0.02)" : "transparent"
                            }}
                          >
                            <td style={{ padding: "12px 8px", fontWeight: "600" }}>{targetLead.name || "CRM Prospect"}</td>
                            <td style={{ padding: "12px 8px" }}>{seq.name || "Sequence"}</td>
                            <td style={{ padding: "12px 8px" }}>Step #{step.step_number || 1} ({step.step_type})</td>
                            <td style={{ padding: "12px 8px", color: "var(--text-muted)" }}>{exec.scheduled_for ? exec.scheduled_for.split("T")[0] : "Immediately"}</td>
                            <td style={{ padding: "12px 8px" }}>
                              <span style={{
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "0.7rem",
                                fontWeight: "600",
                                background: exec.status === "sent" ? "rgba(109,201,165,0.12)" : exec.status === "scheduled" ? "rgba(214,178,74,0.12)" : "rgba(255,255,255,0.05)",
                                color: exec.status === "sent" ? "var(--accent-emerald)" : exec.status === "scheduled" ? "var(--accent-gold)" : "var(--text-primary)"
                              }}>
                                {exec.status?.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: "12px 8px" }}>
                              <div style={{ display: "flex", gap: "6px" }}>
                                {(exec.status === "scheduled" || exec.status === "pending") && (
                                  <button 
                                    className="btn btn-emerald btn-sm"
                                    style={{ padding: "2px 6px", fontSize: "0.7rem" }}
                                    disabled={isExecutingFollowupId === exec.id || !hasPermission(organizationRole, PERMISSIONS.EXECUTE_FOLLOWUPS)}
                                    title={!hasPermission(organizationRole, PERMISSIONS.EXECUTE_FOLLOWUPS) ? "Forbidden: Reps cannot execute" : undefined}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      setIsExecutingFollowupId(exec.id);
                                      try {
                                        await executeFollowup(exec.id);
                                        alert("Email sent successfully!");
                                      } catch (err) {
                                        console.error(err);
                                      } finally {
                                        setIsExecutingFollowupId(null);
                                      }
                                    }}
                                  >
                                    {isExecutingFollowupId === exec.id ? "Sending..." : "Execute"}
                                  </button>
                                )}
                                {(exec.status === "scheduled" || exec.status === "pending" || exec.status === "waiting_reply") && (
                                  <button 
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: "2px 6px", fontSize: "0.7rem", color: "#EF4444" }}
                                    disabled={!hasPermission(organizationRole, PERMISSIONS.CREATE_FOLLOWUPS)}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (confirm("Cancel this follow-up sequence step?")) {
                                        await cancelFollowup(exec.id);
                                      }
                                    }}
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="premium-card" style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "20px" }}>Outbound Follow-Up Timeline</h3>
              
              {!selectedLeadIdForTimeline ? (
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "40px" }}>
                  Select an execution row on the left to inspect the chronological timeline of outbound emails.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
                    <strong>{leads.find(l => l.id === selectedLeadIdForTimeline)?.name || "Lead Details"}</strong>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        if (confirm("Force cancel remaining sequences for this lead?")) {
                          const toCancel = followupExecutions.filter(e => e.lead_id === selectedLeadIdForTimeline && ["scheduled", "pending", "waiting_reply"].includes(e.status));
                          toCancel.forEach(e => cancelFollowup(e.id));
                        }
                      }}
                    >
                      Cancel All Steps
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "24px", position: "relative", paddingLeft: "20px", marginLeft: "10px", borderLeft: "2px solid rgba(255,255,255,0.06)" }}>
                    {followupExecutions
                      .filter(e => e.lead_id === selectedLeadIdForTimeline)
                      .map((exec, idx) => {
                        const step = followupSteps.find(s => s.id === exec.step_id) || {};
                        return (
                          <div key={exec.id} style={{ position: "relative" }}>
                            <span style={{
                              position: "absolute",
                              left: "-26px",
                              top: "4px",
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              border: "2px solid #0a0a0a",
                              backgroundColor: exec.status === "sent" ? "var(--accent-emerald)" : exec.status === "scheduled" ? "var(--accent-gold)" : "var(--text-muted)"
                            }} />

                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                              <span>Step #{step.step_number || 1}: {step.step_type?.toUpperCase()} (Delay: {step.delay_days} days)</span>
                              <span>{exec.scheduled_for ? exec.scheduled_for.split("T")[0] : ""}</span>
                            </div>

                            <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "12px", marginTop: "6px" }}>
                              <strong style={{ fontSize: "0.85rem", display: "block", color: "#fff" }}>
                                {exec.email_subject || step.subject_template || "(Subject pending execution)"}
                              </strong>
                              {exec.email_body ? (
                                <div 
                                  style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "6px", fontFamily: "monospace", whiteSpace: "pre-wrap", maxHeight: "120px", overflowY: "auto", background: "rgba(0,0,0,0.15)", padding: "8px", borderRadius: "4px" }}
                                  dangerouslySetInnerHTML={{ __html: exec.email_body }}
                                />
                              ) : (
                                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "6px", fontStyle: "italic" }}>
                                  AI copywriting templates will be resolved dynamically using stored context parameters (objections and pain points) at execution time.
                                </p>
                              )}
                              {exec.context_snapshot && (
                                <div style={{ marginTop: "10px", borderTop: "1px dashed var(--border-color)", paddingTop: "8px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                  <span>🤖 Context Snapshot: Score {exec.context_snapshot.lead_score} • Status {exec.context_snapshot.nurture_status}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- Sidebar Component Renders ---
  const menuItems = [
    { section: "overview", label: "Dashboard Overview", icon: <LayoutDashboard size={16} /> },
    { section: "leads", label: "Prospects Engine", icon: <Users size={16} /> },
    { section: "pipeline", label: "CRM Kanban Pipeline", icon: <FileText size={16} /> },
    { section: "revenue", label: "Revenue Intelligence", icon: <DollarSign size={16} /> },
    { section: "ai-assistant", label: "AI Sales Assistant", icon: <Sparkles size={16} /> },
    { section: "campaigns", label: "Campaign Center", icon: <Send size={16} /> },
    { section: "followups", label: "Follow-Up Engine", icon: <Repeat size={16} /> },
    { section: "agent", label: "AI Agent Center", icon: <Bot size={16} /> },
    { section: "automations", label: "Node Automations", icon: <Zap size={16} /> },
    { section: "analytics", label: "Analytics Center", icon: <BarChart2 size={16} /> },
    { section: "appointments", label: "Google Calendar Sync", icon: <Calendar size={16} /> },
    { section: "integrations", label: "Integrations Center", icon: <Globe size={16} /> },
    { section: "billing", label: "Subscriptions & Billing", icon: <CreditCard size={16} /> },
    { section: "team", label: "Team Seats", icon: <Users size={16} /> },
    { section: "settings", label: "System Settings", icon: <Settings size={16} /> },
  ];

  return (
    <div className="dashboard-container">
      {/* Sidebar fixed panel */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo" onClick={() => navigateTo("home")} style={{ cursor: "pointer" }}>
          <strong style={{ fontSize: "1.15rem", letterSpacing: "0.05em" }}>ELEVATE <span className="editorial-italic" style={{ color: "var(--accent-gold)" }}>AI</span></strong>
        </div>

        {/* Workspace Switcher */}
        <div style={{ position: "relative", padding: "0 16px", marginBottom: "16px" }}>
          <button 
            onClick={() => setShowOrgSwitcherDropdown(!showOrgSwitcherDropdown)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              padding: "10px 14px",
              color: "#fff",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: "600",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent-gold)"}
            onMouseLeave={(e) => {
              if (!showOrgSwitcherDropdown) {
                e.currentTarget.style.borderColor = "var(--border-color)";
              }
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden", width: "100%" }}>
              <Users size={16} style={{ color: "var(--accent-gold)", flexShrink: 0 }} />
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "left", flexGrow: 1 }}>
                {currentOrganization?.name || "Select Workspace"}
              </span>
            </div>
            <ChevronDown size={14} style={{ color: "var(--text-muted)", flexShrink: 0, transition: "transform 0.2s", transform: showOrgSwitcherDropdown ? "rotate(180deg)" : "none" }} />
          </button>

          {showOrgSwitcherDropdown && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: "16px",
              right: "16px",
              backgroundColor: "#0a0a0a",
              border: "1px solid rgba(197, 160, 40, 0.3)",
              borderRadius: "8px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.8)",
              zIndex: 100,
              padding: "6px 0",
              display: "flex",
              flexDirection: "column",
              maxHeight: "240px",
              overflowY: "auto"
            }}>
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    switchOrganization(org.id);
                    setShowOrgSwitcherDropdown(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    width: "100%",
                    border: "none",
                    background: "none",
                    color: org.id === currentOrganization?.id ? "var(--accent-gold)" : "#fff",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: org.id === currentOrganization?.id ? "600" : "400",
                    transition: "background-color 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{org.name}</span>
                  {org.id === currentOrganization?.id && <span style={{ fontSize: "0.7rem", color: "var(--accent-gold)", opacity: 0.8 }}>Active</span>}
                </button>
              ))}
              <div style={{ borderTop: "1px solid var(--border-color)", margin: "4px 0" }} />
              <button
                onClick={() => {
                  setWizardOrgName("");
                  setWizardLeadsText("");
                  setWizardStep(1);
                  setWizardCalendarConnected(false);
                  setWizardLogoUrl("");
                  setWizardCustomDomain("");
                  setShowOnboardingWizard(true);
                  setShowOrgSwitcherDropdown(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 14px",
                  width: "100%",
                  border: "none",
                  background: "none",
                  color: "var(--accent-gold)",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  transition: "background-color 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.04)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <Plus size={14} />
                <span>Create Workspace</span>
              </button>
            </div>
          )}
        </div>

        <nav className="sidebar-menu">
          {menuItems.map((item) => (
            <div 
              key={item.section}
              className={`sidebar-item ${dashboardSection === item.section ? "active" : ""}`}
              onClick={() => { setSelectedLeadId(null); setDashboardSection(item.section); }}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
          
          {/* Standalone Support button in sidebar */}
          <div 
            className={`sidebar-item support-btn ${dashboardSection === "support" ? "active" : ""}`}
            onClick={() => setDashboardSection("support")}
          >
            <HelpCircle size={16} />
            <span>Support & Strategy</span>
          </div>
        </nav>

        <div className="sidebar-footer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
            {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
              <img 
                src={user.user_metadata.avatar_url || user.user_metadata.picture} 
                alt="User Avatar" 
                style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} 
              />
            ) : (
              <div className="user-avatar" style={{ flexShrink: 0 }}>
                {user?.user_metadata?.full_name?.substring(0, 2).toUpperCase() || user?.email?.substring(0, 2).toUpperCase() || "US"}
              </div>
            )}
            <div className="user-info" style={{ overflow: "hidden" }}>
              <h5 style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0, fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)" }}>
                {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "User"}
              </h5>
              <p style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {user?.email}
              </p>
            </div>
          </div>
          <button 
            onClick={logOut}
            className="button-reset"
            title="Sign Out"
            style={{ 
              background: "none", 
              border: "none", 
              color: "var(--text-muted)", 
              cursor: "pointer", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              padding: "6px",
              borderRadius: "4px",
              transition: "color 0.2s, background-color 0.2s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#ff8b8b"; e.currentTarget.style.backgroundColor = "rgba(220, 38, 38, 0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main content right panel */}
      <div className="dashboard-content-wrapper">
        <header className="dashboard-header">
          <div className="dashboard-title" style={{ textTransform: "capitalize" }}>
            <span>{dashboardSection.replace("-", " ")} Workspace</span>
          </div>
          <div className="nav-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => navigateTo("home")}>
              Exit Dashboard
            </button>
          </div>
        </header>

        <main className="dashboard-main">
          {pendingInvitations && pendingInvitations.length > 0 && (
            <div style={{
              backgroundColor: "rgba(197, 160, 40, 0.08)",
              border: "1px solid var(--accent-gold)",
              borderRadius: "8px",
              padding: "16px 20px",
              marginBottom: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <Users size={20} style={{ color: "var(--accent-gold)", flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.9rem", fontWeight: "600", color: "#fff" }}>Workspace Invitation</h4>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    You have been invited to join <strong>{pendingInvitations[0].organizations?.name || "a workspace"}</strong> as <strong>{pendingInvitations[0].role}</strong>.
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  className="btn btn-sm"
                  style={{ backgroundColor: "var(--accent-gold)", color: "#000", fontWeight: "600", padding: "6px 16px" }}
                  onClick={() => acceptInvitation(pendingInvitations[0].id)}
                >
                  Accept
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ padding: "6px 16px", borderColor: "rgba(255, 255, 255, 0.2)", color: "#fff" }}
                  onClick={() => declineInvitation(pendingInvitations[0].id)}
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {dashboardSection === "overview" && renderOverview()}
          {dashboardSection === "leads" && renderLeads()}
          {dashboardSection === "lead-details" && renderLeadDetails()}
          {dashboardSection === "pipeline" && renderPipeline()}
          {dashboardSection === "revenue" && renderRevenueIntelligence()}
          {dashboardSection === "ai-assistant" && renderAIAssistant()}
          {dashboardSection === "campaigns" && renderCampaignCenter()}
          {dashboardSection === "followups" && renderFollowupCenter()}
          {dashboardSection === "agent" && renderAgentCenter()}
          {dashboardSection === "automations" && renderAutomations()}
          {dashboardSection === "analytics" && renderAnalytics()}
          {dashboardSection === "appointments" && renderAppointments()}
          {dashboardSection === "integrations" && renderIntegrations()}
          {dashboardSection === "billing" && renderBilling()}
          {dashboardSection === "team" && renderTeam()}
          {dashboardSection === "settings" && renderSettings()}
          {dashboardSection === "support" && renderSupport()}
        </main>
      </div>

      {selectedLeadId && (
        <LeadDrawer 
          leadId={selectedLeadId} 
          onClose={() => setSelectedLeadId(null)} 
        />
      )}

      {selectedDealId && (
        <DealDrawer 
          dealId={selectedDealId} 
          onClose={() => setSelectedDealId(null)} 
        />
      )}

      {/* Schedule Sequence Modal — triggered from Prospects Engine lead row */}
      {showScheduleModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.82)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(6px)"
        }}>
          <div style={{
            backgroundColor: "#0d0d0d", border: "1px solid rgba(109,201,165,0.4)",
            borderRadius: "12px", width: "480px", maxWidth: "95%", padding: "32px",
            boxShadow: "0 15px 50px rgba(0,0,0,0.9)", display: "flex",
            flexDirection: "column", gap: "20px", color: "#fff"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "700", color: "var(--accent-emerald)" }}>
                <Repeat size={18} style={{ marginRight: 8 }} />
                Schedule Follow-Up Sequence
              </h3>
              <button onClick={() => setShowScheduleModal(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.4rem", lineHeight: 1 }}>×</button>
            </div>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Select a lead and sequence below. The first step will be scheduled immediately.
            </p>
            <div className="form-group">
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px", display: "block" }}>Lead</label>
              <select
                className="form-input"
                style={{ width: "100%", background: "#0a0a0a", color: "#FFF", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "10px" }}
                value={scheduleModalLeadId}
                onChange={(e) => setScheduleModalLeadId(e.target.value)}
              >
                <option value="">— Select Lead —</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.name} ({l.company || l.email})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "6px", display: "block" }}>Sequence</label>
              <select
                className="form-input"
                style={{ width: "100%", background: "#0a0a0a", color: "#FFF", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "10px" }}
                value={scheduleModalSeqId}
                onChange={(e) => setScheduleModalSeqId(e.target.value)}
              >
                <option value="">— Select Sequence —</option>
                {followupSequences.map(s => <option key={s.id} value={s.id}>{s.name} ({followupSteps.filter(st=>st.sequence_id===s.id).length} steps)</option>)}
              </select>
            </div>
            {scheduleModalSeqId && (
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "12px" }}>
                <p style={{ margin: "0 0 8px 0", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "600" }}>Steps in this sequence:</p>
                {followupSteps.filter(s => s.sequence_id === scheduleModalSeqId).sort((a,b)=>a.step_number-b.step_number).map(s => (
                  <div key={s.id} style={{ fontSize: "0.75rem", color: "var(--text-secondary)", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    Step #{s.step_number}: {s.step_type} — {s.subject_template?.slice(0,45) || "(no subject)"} (Day +{s.delay_days})
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowScheduleModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-gold"
                style={{ flex: 2, fontWeight: "700" }}
                disabled={!scheduleModalLeadId || !scheduleModalSeqId || isScheduling}
                onClick={async () => {
                  if (!scheduleModalLeadId || !scheduleModalSeqId) return;
                  setIsScheduling(true);
                  try {
                    const seqSteps = followupSteps.filter(s => s.sequence_id === scheduleModalSeqId).sort((a,b)=>a.step_number-b.step_number);
                    if (!seqSteps || !seqSteps.length) {
                      alert("This sequence has no steps. Please add steps in Sequence Builder first.");
                      return;
                    }
                    await scheduleFollowup(scheduleModalLeadId, scheduleModalSeqId);
                    setShowScheduleModal(false);
                    setDashboardSection("followups");
                    setActiveFollowupTab("monitor");
                    setTimeout(() => alert("✅ Sequence scheduled! The first step is now in Execution Monitor."), 300);
                  } catch(err) {
                    alert("Error scheduling sequence: " + err.message);
                  } finally {
                    setIsScheduling(false);
                  }
                }}
              >
                {isScheduling ? "Scheduling..." : "▶ Schedule Sequence"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOnboardingWizard && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.85)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(6px)"
        }}>
          <div style={{
            backgroundColor: "#0d0d0d",
            border: "1px solid var(--accent-gold)",
            borderRadius: "12px",
            width: "550px",
            maxWidth: "95%",
            padding: "32px",
            boxShadow: "0 15px 50px rgba(0, 0, 0, 0.9)",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            position: "relative",
            color: "#fff"
          }}>
            {/* Header / Progress bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ fontSize: "0.8rem", color: "var(--accent-gold)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Workspace Onboarding — Step {wizardStep} of 6
              </h4>
              <button 
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem" }}
                onClick={() => {
                  hasCompletedOnboardingRef.current = true;
                  setShowOnboardingWizard(false);
                }}
              >✕</button>
            </div>

            
            <div style={{ width: "100%", height: "4px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: `${(wizardStep / 6) * 100}%`, height: "100%", background: "var(--accent-gold)", transition: "width 0.3s ease" }} />
            </div>

            {/* Step 1: Identity */}
            {wizardStep === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ fontSize: "1.3rem", fontWeight: "600", color: "#fff" }}>Name Your Workspace</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Create a dedicated space for your team's pipelines, campaigns, and AI agents.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Workspace Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Acme Sales, Elevate Growth" 
                    value={wizardOrgName}
                    onChange={(e) => setWizardOrgName(e.target.value)}
                    style={{
                      backgroundColor: "#161616",
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
                      padding: "10px 14px",
                      color: "#fff",
                      fontSize: "0.9rem"
                    }}
                    autoFocus
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                  <button 
                    className="btn btn-gold" 
                    disabled={!wizardOrgName.trim()} 
                    onClick={() => setWizardStep(2)}
                    style={{ padding: "10px 24px" }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Industry */}
            {wizardStep === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ fontSize: "1.3rem", fontWeight: "600" }}>Choose Industry Vertical</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  This fine-tunes Elevate's qualification templates and automatic scoring models.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Industry Focus</label>
                  <select 
                    value={wizardOrgIndustry} 
                    onChange={(e) => setWizardOrgIndustry(e.target.value)}
                    style={{
                      backgroundColor: "#161616",
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
                      padding: "10px 14px",
                      color: "#fff",
                      fontSize: "0.9rem"
                    }}
                  >
                    <option value="AI Operations">AI Operations</option>
                    <option value="Technology & SaaS">Technology & SaaS</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Financial Services">Financial Services</option>
                    <option value="Healthcare & Life Sciences">Healthcare & Life Sciences</option>
                    <option value="Professional Consulting">Professional Consulting</option>
                    <option value="Retail & E-commerce">Retail & E-commerce</option>
                  </select>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
                  <button className="btn btn-secondary" onClick={() => setWizardStep(1)}>Back</button>
                  <button className="btn btn-gold" onClick={() => setWizardStep(3)}>Continue</button>
                </div>
              </div>
            )}

            {/* Step 3: Team Size */}
            {wizardStep === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ fontSize: "1.3rem", fontWeight: "600" }}>Select Team Size</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  We'll pre-allocate resources and seat limits for your workspace.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "8px" }}>
                  {[
                    { val: "1-5", label: "Solo / Small Team", desc: "1-5 seats (Growth Plan)" },
                    { val: "6-20", label: "Medium Organization", desc: "6-20 seats (Pro Plan)" },
                    { val: "21-100", label: "Large Enterprise", desc: "21-100 seats (Scale Plan)" },
                    { val: "100+", label: "Global Scale", desc: "100+ seats (Custom Plan)" }
                  ].map((t) => (
                    <div 
                      key={t.val} 
                      onClick={() => setWizardTeamSize(t.val)}
                      style={{
                        padding: "16px",
                        borderRadius: "8px",
                        backgroundColor: wizardTeamSize === t.val ? "rgba(197, 160, 40, 0.08)" : "#161616",
                        border: wizardTeamSize === t.val ? "1px solid var(--accent-gold)" : "1px solid var(--border-color)",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      <strong style={{ display: "block", fontSize: "0.9rem", color: wizardTeamSize === t.val ? "var(--accent-gold)" : "#fff" }}>{t.label}</strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{t.desc}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
                  <button className="btn btn-secondary" onClick={() => setWizardStep(2)}>Back</button>
                  <button className="btn btn-gold" onClick={() => setWizardStep(4)}>Continue</button>
                </div>
              </div>
            )}

            {/* Step 4: Import Leads */}
            {wizardStep === 4 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ fontSize: "1.3rem", fontWeight: "600" }}>Warm Up Your Pipeline</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Import prospects directly. Our AI scoring engine will evaluate each contact instantly.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                    <span>Paste Leads (one per line)</span>
                    <span style={{ color: "var(--accent-gold)" }}>Format: Name, Email</span>
                  </label>
                  <textarea 
                    placeholder="Jane Doe, jane@company.com&#10;Bob Smith, bob@acme.org"
                    value={wizardLeadsText}
                    onChange={(e) => setWizardLeadsText(e.target.value)}
                    style={{
                      backgroundColor: "#161616",
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
                      padding: "10px 14px",
                      color: "#fff",
                      fontSize: "0.85rem",
                      height: "120px",
                      resize: "none",
                      fontFamily: "monospace"
                    }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
                  <button className="btn btn-secondary" onClick={() => setWizardStep(3)}>Back</button>
                  <button className="btn btn-gold" onClick={() => setWizardStep(5)}>Continue</button>
                </div>
              </div>
            )}

            {/* Step 5: Calendar Connect */}
            {wizardStep === 5 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ fontSize: "1.3rem", fontWeight: "600" }}>Connect Calendars</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Allow AI Agents to schedule client meetings directly into your calendar.
                </p>
                <div style={{
                  padding: "24px",
                  borderRadius: "8px",
                  border: "1px dashed var(--border-color)",
                  textAlign: "center",
                  backgroundColor: "rgba(255,255,255,0.01)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px"
                }}>
                  <Calendar size={32} style={{ color: "var(--accent-gold)" }} />
                  {wizardCalendarConnected ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent-emerald)" }}>
                      <CheckCircle2 size={16} />
                      <strong>Google Calendar Connected</strong>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "12px" }}>
                        Enable meeting booking briefs and AI reservation syncing.
                      </p>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => setWizardCalendarConnected(true)}
                      >
                        Connect Google Account
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
                  <button className="btn btn-secondary" onClick={() => setWizardStep(4)}>Back</button>
                  <button className="btn btn-gold" onClick={() => setWizardStep(6)}>Continue</button>
                </div>
              </div>
            )}

            {/* Step 6: Branding & Domain (Launch!) */}
            {wizardStep === 6 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ fontSize: "1.3rem", fontWeight: "600" }}>Workspace Customization</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Style your workspace and set your custom subdomains.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Branding Color</label>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input 
                        type="color" 
                        value={wizardBrandingColor} 
                        onChange={(e) => setWizardBrandingColor(e.target.value)}
                        style={{
                          backgroundColor: "transparent",
                          border: "none",
                          width: "36px",
                          height: "36px",
                          cursor: "pointer"
                        }}
                      />
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{wizardBrandingColor}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Custom Domain (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="crm.company.com" 
                      value={wizardCustomDomain}
                      onChange={(e) => setWizardCustomDomain(e.target.value)}
                      style={{
                        backgroundColor: "#161616",
                        border: "1px solid var(--border-color)",
                        borderRadius: "6px",
                        padding: "8px 12px",
                        color: "#fff",
                        fontSize: "0.85rem"
                      }}
                    />
                  </div>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Logo URL (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="https://company.com/logo.png" 
                    value={wizardLogoUrl}
                    onChange={(e) => setWizardLogoUrl(e.target.value)}
                    style={{
                      backgroundColor: "#161616",
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
                      padding: "8px 12px",
                      color: "#fff",
                      fontSize: "0.85rem"
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
                  <button className="btn btn-secondary" onClick={() => setWizardStep(5)}>Back</button>
                  <button 
                    className="btn btn-gold" 
                    onClick={async () => {
                      setIsCreatingOrg(true);
                      // Set the guard BEFORE calling createOrganization so the onboarding
                      // trigger useEffect can't reopen the wizard during the async flow
                      hasCompletedOnboardingRef.current = true;
                      try {
                        const lines = wizardLeadsText.split("\n").filter(l => l.trim());
                        const initialLeads = lines.map(line => {
                          const parts = line.split(",");
                          const name = parts[0]?.trim() || "Imported Lead";
                          const email = parts[1]?.trim() || `${name.toLowerCase().replace(/ /g, "")}@example.com`;
                          return { name, email };
                        });
                        
                        const newOrg = await createOrganization(
                          wizardOrgName,
                          wizardOrgIndustry,
                          wizardTeamSize,
                          initialLeads,
                          wizardLogoUrl || null,
                          wizardBrandingColor
                        );
                        if (newOrg && wizardCustomDomain) {
                          await updateBranding({
                            custom_domain: wizardCustomDomain
                          });
                        }
                        setShowOnboardingWizard(false);
                      } catch (err) {
                        // On error, allow the wizard to reopen if needed
                        hasCompletedOnboardingRef.current = false;
                        console.error(err);
                      } finally {
                        setIsCreatingOrg(false);
                      }
                    }}
                    style={{ padding: "10px 24px" }}
                    disabled={isCreatingOrg}
                  >
                    {isCreatingOrg ? "Creating..." : "Launch Workspace"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
