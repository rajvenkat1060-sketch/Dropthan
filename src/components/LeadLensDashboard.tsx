import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Activity,
  Copy,
  Check,
  ExternalLink,
  Flame,
  MessageCircle,
  Phone,
  Mail,
  Search,
  RefreshCw,
  Database,
  Code2,
  Sparkles,
  Zap,
  SlidersHorizontal,
  ChevronDown,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Download,
  Info
} from 'lucide-react';
import { LeadRecord, UserProfile } from '../types';
import {
  LEADLENS_BRAND_ID,
  LEADLENS_API_KEY,
  LEADLENS_SCRIPT_URL,
  SUPABASE_TARGET_PROJECT_URL,
  TRACKING_SCRIPT_SNIPPET,
  LEADS_SETUP_SQL,
} from '../lib/leadsSchema';
import {
  fetchLeadsFromSupabase,
  subscribeToLeadsRealtime,
  updateLeadStatusInSupabase,
  deleteLeadFromSupabase,
  triggerTestAbandonedLead,
  getStoredAnonKey,
  setStoredAnonKey,
} from '../lib/leadlensSupabase';

interface LeadLensDashboardProps {
  user?: UserProfile | null;
  onSelectTab?: (tab: string) => void;
}

export const LeadLensDashboard: React.FC<LeadLensDashboardProps> = ({ user }) => {
  const [activeSection, setActiveSection] = useState<'live-leads' | 'sql-editor' | 'tracking-code' | 'recovery-settings'>('live-leads');
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const [recentLeadAlert, setRecentLeadAlert] = useState<LeadRecord | null>(null);

  // Copy states
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [copiedLeadId, setCopiedLeadId] = useState<string | null>(null);

  // Custom Supabase key settings state
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [customAnonKey, setCustomAnonKey] = useState<string>(getStoredAnonKey());
  const [keySavedMessage, setKeySavedMessage] = useState<string>('');
  const [isTestingLead, setIsTestingLead] = useState<boolean>(false);

  // Load leads from Supabase on mount
  const loadLeads = useCallback(async () => {
    setIsLoading(true);
    const { leads: fetched, error } = await fetchLeadsFromSupabase();
    setLeads(fetched);
    setIsLoading(false);
    if (error) {
      console.warn('Supabase lead fetch notice:', error);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Subscribe to real-time changes
  useEffect(() => {
    const unsubscribe = subscribeToLeadsRealtime(
      ({ eventType, lead, oldId }) => {
        setIsRealtimeConnected(true);
        if (eventType === 'INSERT') {
          setLeads((prev) => {
            const alreadyExists = prev.some((l) => l.id === lead.id);
            if (alreadyExists) return prev;
            return [lead, ...prev];
          });
          // Show neon notification banner
          setRecentLeadAlert(lead);
          setTimeout(() => setRecentLeadAlert(null), 6000);
        } else if (eventType === 'UPDATE') {
          setLeads((prev) => prev.map((l) => (l.id === lead.id ? lead : l)));
        } else if (eventType === 'DELETE') {
          setLeads((prev) => prev.filter((l) => l.id !== (lead?.id || oldId)));
        }
      },
      (status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsRealtimeConnected(false);
        }
      }
    );

    // Initial connected state assumption for responsive visual feedback
    const timer = setTimeout(() => setIsRealtimeConnected(true), 1200);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : (lead.status || '').toLowerCase() === statusFilter.toLowerCase();

      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchesStatus;

      const matchesQuery =
        (lead.visitor_name || '').toLowerCase().includes(query) ||
        (lead.phone_number || '').toLowerCase().includes(query) ||
        (lead.email || '').toLowerCase().includes(query) ||
        (lead.clicked_item || '').toLowerCase().includes(query) ||
        (lead.status || '').toLowerCase().includes(query);

      return matchesStatus && matchesQuery;
    });
  }, [leads, statusFilter, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const total = leads.length;
    const abandoned = leads.filter((l) => (l.status || '').toLowerCase() === 'abandoned').length;
    const contacted = leads.filter((l) => (l.status || '').toLowerCase() === 'contacted').length;
    const recovered = leads.filter((l) => (l.status || '').toLowerCase() === 'recovered').length;
    const recoveryRate = total > 0 ? Math.round((recovered / total) * 100) : 0;
    return { total, abandoned, contacted, recovered, recoveryRate };
  }, [leads]);

  // Copy Snippet handler
  const handleCopySnippet = () => {
    navigator.clipboard.writeText(TRACKING_SCRIPT_SNIPPET);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  // Copy SQL handler
  const handleCopySql = () => {
    navigator.clipboard.writeText(LEADS_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Status changer
  const handleStatusChange = async (id: string, newStatus: string) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
    await updateLeadStatusInSupabase(id, newStatus);
  };

  // Delete lead
  const handleDeleteLead = async (id: string) => {
    if (!confirm('Are you sure you want to remove this lead record?')) return;
    setLeads((prev) => prev.filter((l) => l.id !== id));
    await deleteLeadFromSupabase(id);
  };

  // Dispatch instant test lead
  const handleTriggerTestLead = async () => {
    setIsTestingLead(true);
    try {
      const newLead = await triggerTestAbandonedLead();
      setLeads((prev) => [newLead, ...prev.filter((l) => l.id !== newLead.id)]);
      setRecentLeadAlert(newLead);
      setTimeout(() => setRecentLeadAlert(null), 5000);
    } catch (err) {
      console.error('Failed to trigger test lead:', err);
    } finally {
      setIsTestingLead(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (leads.length === 0) return;
    const headers = ['ID', 'Brand ID', 'Visitor Name', 'Phone Number', 'Email', 'Clicked Item', 'Status', 'Created At'];
    const rows = leads.map((l) => [
      l.id,
      l.brand_id,
      `"${(l.visitor_name || '').replace(/"/g, '""')}"`,
      `"${(l.phone_number || '').replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      `"${(l.clicked_item || '').replace(/"/g, '""')}"`,
      l.status,
      l.created_at,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dropthan_leads_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save Anon Key
  const handleSaveAnonKey = () => {
    setStoredAnonKey(customAnonKey);
    setKeySavedMessage('✓ Supabase connection updated! Reloading leads stream...');
    setTimeout(() => {
      setKeySavedMessage('');
      setShowKeyModal(false);
      loadLeads();
    }, 1500);
  };

  // Time relative formatter
  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    const now = Date.now();
    const then = new Date(isoString).getTime();
    const diffSecs = Math.max(0, Math.floor((now - then) / 1000));
    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(isoString).toLocaleDateString();
  };

  // WhatsApp quick recovery generator
  const getWhatsAppRecoveryUrl = (lead: LeadRecord) => {
    const rawPhone = (lead.phone_number || '').replace(/\D/g, '');
    if (!rawPhone) return '#';
    const name = lead.visitor_name ? lead.visitor_name.split(' ')[0] : 'there';
    const item = lead.clicked_item || 'our wholesale catalog';
    const text = encodeURIComponent(
      `Hello ${name}! 👋 We noticed you were interested in "${item}" on Dropthan Wholesale.\n\nWe have exclusive exporter & dropshipping bulk rates available right now. Would you like us to share the direct price list or MOQ quotation?`
    );
    return `https://wa.me/${rawPhone}?text=${text}`;
  };

  return (
    <div className="w-full bg-[#05070f] text-slate-100 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden font-sans select-text">
      {/* REALTIME NEW LEAD TOAST ALERT */}
      {recentLeadAlert && (
        <div className="bg-gradient-to-r from-[#00E5FF]/20 via-[#00FF66]/20 to-transparent border-b border-[#00E5FF]/40 px-4 py-2.5 flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF66] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00FF66]"></span>
            </span>
            <div className="text-xs">
              <span className="font-bold text-[#00FF66]">⚡ NEW ABANDONED LEAD DETECTED:</span>{' '}
              <span className="font-black text-white">{recentLeadAlert.visitor_name || 'Visitor'}</span> viewed{' '}
              <span className="text-[#00E5FF] font-semibold underline">{recentLeadAlert.clicked_item}</span>
              {recentLeadAlert.phone_number && (
                <span className="ml-2 text-slate-300 font-mono text-[11px]">({recentLeadAlert.phone_number})</span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {recentLeadAlert.phone_number && (
              <a
                href={getWhatsAppRecoveryUrl(recentLeadAlert)}
                target="_blank"
                rel="noreferrer"
                className="bg-[#00FF66] hover:bg-[#00FF66]/90 text-black px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 shadow-sm transition active:scale-95"
              >
                <MessageCircle className="w-3 h-3" />
                <span>Recover via WhatsApp</span>
              </a>
            )}
            <button
              onClick={() => setRecentLeadAlert(null)}
              className="text-slate-400 hover:text-white text-xs px-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* TOP HEADER & NAVIGATION */}
      <div className="border-b border-slate-800/80 bg-gradient-to-b from-[#0a0f1d] to-[#05070f] p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* BRAND TITLE & REALTIME STATUS */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 bg-[#00E5FF]/10 border border-[#00E5FF]/40 rounded-xl shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                <Activity className="w-5 h-5 text-[#00E5FF]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>LeadLens Abandonment Intelligence</span>
                <span className="bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  v2.0 Live
                </span>
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-2 flex-wrap">
              <span>Connected to Supabase:</span>
              <code className="text-[#00E5FF] font-mono text-xs bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700/60">
                {SUPABASE_TARGET_PROJECT_URL}
              </code>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">Brand ID:</span>
              <code className="text-[#00FF66] font-mono text-xs bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700/60">
                {LEADLENS_BRAND_ID}
              </code>
            </p>
          </div>

          {/* REALTIME PULSE INDICATOR & TOP QUICK ACTIONS */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                isRealtimeConnected
                  ? 'bg-[#00FF66]/10 border-[#00FF66]/40 text-[#00FF66] shadow-[0_0_15px_rgba(0,255,102,0.15)]'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              <span className="relative flex h-2.5 w-2.5">
                {isRealtimeConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF66] opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    isRealtimeConnected ? 'bg-[#00FF66]' : 'bg-amber-400'
                  }`}
                ></span>
              </span>
              <span>{isRealtimeConnected ? 'REALTIME STREAM ACTIVE' : 'CONNECTING...'}</span>
            </div>

            <button
              onClick={handleTriggerTestLead}
              disabled={isTestingLead}
              className="bg-gradient-to-r from-[#00E5FF] to-[#00FF66] hover:opacity-90 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-[0_0_20px_rgba(0,229,255,0.25)] active:scale-95 disabled:opacity-50"
              title="Inject a realistic test abandoned lead into Supabase"
            >
              <Flame className={`w-3.5 h-3.5 ${isTestingLead ? 'animate-spin' : ''}`} />
              <span>{isTestingLead ? 'Injecting Lead...' : 'Test Abandoned Lead'}</span>
            </button>

            <button
              onClick={() => setShowKeyModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 p-2 rounded-xl transition cursor-pointer"
              title="Configure Supabase Connection Key"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* METRICS STATS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-[#0b1021] border border-slate-800/90 rounded-2xl p-3.5 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Captured Leads</span>
            <div className="text-xl sm:text-2xl font-black text-white flex items-center justify-between">
              <span>{metrics.total}</span>
              <Database className="w-4 h-4 text-[#00E5FF]" />
            </div>
          </div>

          <div className="bg-[#0b1021] border border-red-900/30 rounded-2xl p-3.5 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">Abandoned / Dropped</span>
            <div className="text-xl sm:text-2xl font-black text-red-300 flex items-center justify-between">
              <span>{metrics.abandoned}</span>
              <Flame className="w-4 h-4 text-red-400" />
            </div>
          </div>

          <div className="bg-[#0b1021] border border-amber-900/30 rounded-2xl p-3.5 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">In Contact / Follow-up</span>
            <div className="text-xl sm:text-2xl font-black text-amber-300 flex items-center justify-between">
              <span>{metrics.contacted}</span>
              <Phone className="w-4 h-4 text-amber-400" />
            </div>
          </div>

          <div className="bg-[#0b1021] border border-[#00FF66]/30 rounded-2xl p-3.5 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#00FF66]">Recovered Orders</span>
            <div className="text-xl sm:text-2xl font-black text-[#00FF66] flex items-center justify-between">
              <span>{metrics.recovered}</span>
              <span className="text-xs font-mono font-bold bg-[#00FF66]/20 px-1.5 py-0.5 rounded text-[#00FF66]">
                {metrics.recoveryRate}% Rate
              </span>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center space-x-2 mt-6 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveSection('live-leads')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeSection === 'live-leads'
                ? 'bg-[#00E5FF] text-slate-950 shadow-[0_0_15px_rgba(0,229,255,0.3)]'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>1. Real-Time Abandoned Leads Table ({leads.length})</span>
          </button>

          <button
            onClick={() => setActiveSection('sql-editor')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeSection === 'sql-editor'
                ? 'bg-[#00FF66] text-slate-950 shadow-[0_0_15px_rgba(0,255,102,0.3)]'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>2. SQL Editor &amp; Migration Assistant</span>
          </button>

          <button
            onClick={() => setActiveSection('tracking-code')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeSection === 'tracking-code'
                ? 'bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>3. JavaScript Tracking Snippet</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: REAL-TIME ABANDONED LEADS TABLE */}
      {activeSection === 'live-leads' && (
        <div className="p-4 sm:p-6 space-y-4">
          {/* SEARCH, STATUS FILTER & ACTIONS BAR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* SEARCH */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search visitor, phone, email, or item..."
                className="w-full bg-[#0a0f1d] border border-slate-800 focus:border-[#00E5FF] text-white placeholder-slate-500 pl-10 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#00E5FF] transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* FILTER PILLS & EXPORT */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                {['all', 'abandoned', 'contacted', 'recovered'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg capitalize transition cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#00E5FF] text-slate-950 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <button
                onClick={loadLeads}
                className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition cursor-pointer"
                title="Refresh leads from Supabase"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
                title="Download leads as CSV"
              >
                <Download className="w-3.5 h-3.5 text-[#00FF66]" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="bg-[#090d1a] border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0d1426] text-slate-400 uppercase tracking-wider text-[10px] font-black">
                    <th className="py-3 px-4">Visitor / Contact</th>
                    <th className="py-3 px-4">Phone &amp; Email</th>
                    <th className="py-3 px-4">Clicked Item / Cart Drop</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Activity Time</th>
                    <th className="py-3 px-4 text-right">Quick Recovery Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 space-y-2">
                        <ShoppingBag className="w-8 h-8 mx-auto text-slate-600" />
                        <p className="font-bold text-slate-400">No abandoned leads match your search.</p>
                        <p className="text-[11px] text-slate-500">
                          Click <span className="text-[#00E5FF] font-semibold">"Test Abandoned Lead"</span> above to simulate an incoming lead stream.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => {
                      const isAbandoned = (lead.status || '').toLowerCase() === 'abandoned';
                      const isContacted = (lead.status || '').toLowerCase() === 'contacted';
                      const isRecovered = (lead.status || '').toLowerCase() === 'recovered';

                      return (
                        <tr
                          key={lead.id}
                          className="hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* VISITOR NAME */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00E5FF]/20 to-[#00FF66]/20 border border-[#00E5FF]/30 flex items-center justify-center text-white font-black text-xs shrink-0">
                                {(lead.visitor_name || 'V')[0].toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-white text-xs">
                                  {lead.visitor_name || 'Anonymous Visitor'}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  ID: {lead.id.substring(0, 8)}...
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* PHONE & EMAIL */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col space-y-1">
                              {lead.phone_number ? (
                                <div className="flex items-center space-x-1.5 text-slate-200 font-mono text-[11px]">
                                  <Phone className="w-3 h-3 text-[#00FF66]" />
                                  <span>{lead.phone_number}</span>
                                </div>
                              ) : (
                                <span className="text-slate-600 text-[11px] italic">No phone captured</span>
                              )}

                              {lead.email ? (
                                <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
                                  <Mail className="w-3 h-3 text-[#00E5FF]" />
                                  <span className="truncate max-w-[150px]">{lead.email}</span>
                                </div>
                              ) : (
                                <span className="text-slate-600 text-[10px] italic">No email captured</span>
                              )}
                            </div>
                          </td>

                          {/* CLICKED ITEM */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="flex items-start space-x-2">
                              <ShoppingBag className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-200 text-xs line-clamp-2">
                                  {lead.clicked_item || 'Direct Storefront Inquiry'}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  Detected via LeadLens tracker
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* STATUS BADGE & SELECT */}
                          <td className="py-3.5 px-4">
                            <div className="relative inline-block">
                              <select
                                value={lead.status || 'Abandoned'}
                                onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                                className={`text-[11px] font-black rounded-lg px-2.5 py-1 pr-6 border cursor-pointer appearance-none transition focus:outline-none ${
                                  isAbandoned
                                    ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:border-red-500'
                                    : isContacted
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:border-amber-500'
                                    : isRecovered
                                    ? 'bg-[#00FF66]/10 text-[#00FF66] border-[#00FF66]/30 hover:border-[#00FF66]'
                                    : 'bg-slate-800 text-slate-300 border-slate-700'
                                }`}
                              >
                                <option value="Abandoned" className="bg-slate-900 text-red-400">
                                  Abandoned
                                </option>
                                <option value="Contacted" className="bg-slate-900 text-amber-400">
                                  Contacted
                                </option>
                                <option value="Recovered" className="bg-slate-900 text-[#00FF66]">
                                  Recovered
                                </option>
                                <option value="Closed" className="bg-slate-900 text-slate-300">
                                  Closed
                                </option>
                              </select>
                              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </td>

                          {/* TIME */}
                          <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-slate-200 font-semibold">{formatRelativeTime(lead.created_at)}</span>
                              <span className="text-[10px] text-slate-500">
                                {lead.created_at ? new Date(lead.created_at).toLocaleTimeString() : ''}
                              </span>
                            </div>
                          </td>

                          {/* ACTIONS */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {lead.phone_number && (
                                <a
                                  href={getWhatsAppRecoveryUrl(lead)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 bg-[#00FF66]/10 hover:bg-[#00FF66] text-[#00FF66] hover:text-black border border-[#00FF66]/30 rounded-lg transition active:scale-95"
                                  title="Send WhatsApp recovery message"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                              )}

                              {lead.phone_number && (
                                <a
                                  href={`tel:${lead.phone_number}`}
                                  className="p-1.5 bg-blue-500/10 hover:bg-blue-500 text-[#00E5FF] hover:text-black border border-blue-500/30 rounded-lg transition active:scale-95"
                                  title="Direct Phone Call"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              )}

                              {lead.email && (
                                <a
                                  href={`mailto:${lead.email}?subject=Dropthan%20Wholesale%20Inquiry%20-${encodeURIComponent(
                                    lead.clicked_item || 'Product'
                                  )}`}
                                  className="p-1.5 bg-purple-500/10 hover:bg-purple-500 text-purple-300 hover:text-white border border-purple-500/30 rounded-lg transition active:scale-95"
                                  title="Send Email"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </a>
                              )}

                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    `Name: ${lead.visitor_name}\nPhone: ${lead.phone_number}\nEmail: ${lead.email}\nItem: ${lead.clicked_item}`
                                  );
                                  setCopiedLeadId(lead.id);
                                  setTimeout(() => setCopiedLeadId(null), 2000);
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                                title="Copy contact info"
                              >
                                {copiedLeadId === lead.id ? (
                                  <Check className="w-3.5 h-3.5 text-[#00FF66]" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                onClick={() => handleDeleteLead(lead.id)}
                                className="p-1.5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-lg transition"
                                title="Delete lead record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: IN-APP SQL EDITOR & MIGRATION ASSISTANT */}
      {activeSection === 'sql-editor' && (
        <div className="p-4 sm:p-6 space-y-6">
          <div className="bg-[#0b1021] border border-[#00FF66]/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#00FF66]/10 border border-[#00FF66]/30 rounded-lg text-[#00FF66]">
                  <Database className="w-4 h-4" />
                </span>
                <h3 className="text-base font-black text-white">
                  Supabase Schema Migration &amp; Setup Assistant
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Execute this production script in your Supabase SQL Editor. It cleans legacy tables, provisions the exact{' '}
                <code className="text-[#00FF66] font-mono">public.leads</code> table, creates composite indexes, enforces RLS policies, and enables real-time replication.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                onClick={handleCopySql}
                className="bg-[#00FF66] hover:bg-[#00FF66]/90 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,102,0.3)] active:scale-95"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>COPIED TO CLIPBOARD!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>COPY SQL SCRIPT</span>
                  </>
                )}
              </button>

              <a
                href="https://supabase.com/dashboard/project/jfsmjztrnicqrcvgyzgd/sql/new"
                target="_blank"
                rel="noreferrer"
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-700 transition cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <span>Open Supabase SQL Editor</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#00E5FF]" />
              </a>
            </div>
          </div>

          {/* STEP BY STEP MIGRATION GUIDE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#090d1a] border border-slate-800 p-3.5 rounded-2xl space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-black text-[#00E5FF]">
                <span className="w-5 h-5 rounded-full bg-[#00E5FF]/20 flex items-center justify-center text-[10px]">1</span>
                <span>Copy SQL Block</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Click "COPY SQL SCRIPT" above to copy the schema definition and RLS policies to your clipboard.
              </p>
            </div>

            <div className="bg-[#090d1a] border border-slate-800 p-3.5 rounded-2xl space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-black text-[#00FF66]">
                <span className="w-5 h-5 rounded-full bg-[#00FF66]/20 flex items-center justify-center text-[10px]">2</span>
                <span>Run in Supabase Dashboard</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Open project <code className="text-slate-300">jfsmjztrnicqrcvgyzgd</code> &gt; SQL Editor, paste the code, and hit "Run".
              </p>
            </div>

            <div className="bg-[#090d1a] border border-slate-800 p-3.5 rounded-2xl space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-black text-purple-400">
                <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px]">3</span>
                <span>Verify Realtime Stream</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Return here and click "Test Abandoned Lead". You will see new visitor drop-offs appear instantly without refreshing!
              </p>
            </div>
          </div>

          {/* IN-APP CODE EDITOR VIEW */}
          <div className="bg-[#030611] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-[#070b18] px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block"></span>
                <span className="ml-2 font-mono text-slate-300 text-[11px]">public.leads_schema.sql</span>
              </div>
              <button
                onClick={handleCopySql}
                className="text-[#00FF66] hover:underline font-mono text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedSql ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <pre className="p-4 sm:p-6 text-[11px] sm:text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed max-h-[500px] scrollbar-thin">
              <code>{LEADS_SETUP_SQL}</code>
            </pre>
          </div>
        </div>
      )}

      {/* SECTION 3: JAVASCRIPT TRACKING SNIPPET */}
      {activeSection === 'tracking-code' && (
        <div className="p-4 sm:p-6 space-y-6">
          <div className="bg-[#0b1021] border border-purple-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400">
                  <Code2 className="w-4 h-4" />
                </span>
                <h3 className="text-base font-black text-white">
                  LeadLens Global Storefront Tracker Snippet
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Insert this tracking tag into the HTML <code className="text-purple-300">&lt;head&gt;</code> or right before the closing <code className="text-purple-300">&lt;/body&gt;</code> of your storefronts to enable automatic phone/email capture and product abandonment intelligence.
              </p>
            </div>

            <button
              onClick={handleCopySnippet}
              className="bg-gradient-to-r from-purple-500 to-[#00E5FF] hover:opacity-90 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.3)] shrink-0 active:scale-95"
            >
              {copiedSnippet ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>COPIED SNIPPET!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>COPY TRACKER SCRIPT</span>
                </>
              )}
            </button>
          </div>

          {/* SCRIPT DISPLAY AREA */}
          <div className="bg-[#030611] border border-purple-500/20 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-[#070b18] px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-purple-300 text-[11px]">HTML Embed Code</span>
              <button
                onClick={handleCopySnippet}
                className="text-purple-400 hover:text-white font-mono text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-x-auto">
              <pre className="text-xs font-mono text-[#00E5FF] bg-black/60 p-4 rounded-xl border border-slate-800/80">
                <code>{TRACKING_SCRIPT_SNIPPET}</code>
              </pre>
            </div>
          </div>

          {/* CONFIGURATION SPECS CARD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#090d1a] border border-slate-800 p-4 rounded-2xl space-y-2">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>Brand Configuration Parameters</span>
              </h4>
              <ul className="text-xs text-slate-400 space-y-1.5 font-mono">
                <li>
                  <span className="text-slate-500">data-brand-id:</span>{' '}
                  <span className="text-[#00FF66] font-bold">"{LEADLENS_BRAND_ID}"</span>
                </li>
                <li>
                  <span className="text-slate-500">data-api-key:</span>{' '}
                  <span className="text-[#00E5FF] font-bold">"{LEADLENS_API_KEY}"</span>
                </li>
                <li>
                  <span className="text-slate-500">tracker-src:</span>{' '}
                  <span className="text-slate-300">"{LEADLENS_SCRIPT_URL}"</span>
                </li>
              </ul>
            </div>

            <div className="bg-[#090d1a] border border-slate-800 p-4 rounded-2xl space-y-2">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF66]" />
                <span>Automated Capabilities</span>
              </h4>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Automatically detects input keystrokes for Phone Numbers &amp; Email IDs</li>
                <li>• Tracks product catalog clicks and modal inspections</li>
                <li>• Detects cart &amp; checkout abandonment in real time</li>
                <li>• Streams records directly to Supabase table <code className="text-[#00FF66]">public.leads</code></li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOM SUPABASE ANON KEY CONFIGURATION */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1021] border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-[#00E5FF]" />
                <span>Supabase Connection Settings</span>
              </h3>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block font-bold mb-1">Target Project URL</label>
                <input
                  type="text"
                  readOnly
                  value={SUPABASE_TARGET_PROJECT_URL}
                  className="w-full bg-slate-900 border border-slate-800 text-[#00E5FF] px-3 py-2 rounded-xl font-mono text-xs cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-slate-400 block font-bold mb-1">
                  Custom Anon Key (Optional override)
                </label>
                <textarea
                  rows={3}
                  value={customAnonKey}
                  onChange={(e) => setCustomAnonKey(e.target.value)}
                  placeholder="Paste your Supabase project anon key here..."
                  className="w-full bg-slate-900 border border-slate-800 focus:border-[#00FF66] text-white px-3 py-2 rounded-xl font-mono text-xs focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  If left default, the app uses the pre-configured project credentials.
                </p>
              </div>

              {keySavedMessage && (
                <div className="p-2.5 bg-[#00FF66]/10 border border-[#00FF66]/40 rounded-xl text-[#00FF66] font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{keySavedMessage}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAnonKey}
                className="px-4 py-2 bg-[#00FF66] text-slate-950 font-black text-xs rounded-xl hover:bg-[#00FF66]/90 transition"
              >
                Save &amp; Reconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
