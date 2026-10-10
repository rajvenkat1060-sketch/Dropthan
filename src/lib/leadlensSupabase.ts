import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { LeadRecord } from '../types';
import { LEADLENS_BRAND_ID, SUPABASE_TARGET_PROJECT_URL } from './leadsSchema';

// Default target credentials for user's Supabase project:
// Project: https://jfsmjztrnicqrcvgyzgd.supabase.co
const DEFAULT_SUPABASE_URL = SUPABASE_TARGET_PROJECT_URL;

// Retrieve stored custom anon key or fallback to env or public client key
export const getStoredAnonKey = (): string => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('leadlens_custom_anon_key') || 
         import.meta.env.VITE_LEADLENS_SUPABASE_ANON_KEY || 
         import.meta.env.VITE_SUPABASE_ANON_KEY || 
         'sb_publishable_s8wtq-Mx3OMobIMCSZ69cA_gzo9VbvJ';
};

export const setStoredAnonKey = (key: string) => {
  if (typeof window === 'undefined') return;
  if (key) {
    localStorage.setItem('leadlens_custom_anon_key', key.trim());
  } else {
    localStorage.removeItem('leadlens_custom_anon_key');
  }
};

let clientInstance: SupabaseClient | null = null;
let currentKeyUsed: string = '';

export const getLeadLensSupabase = (): SupabaseClient => {
  const currentKey = getStoredAnonKey();
  if (!clientInstance || currentKeyUsed !== currentKey) {
    clientInstance = createClient(DEFAULT_SUPABASE_URL, currentKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    currentKeyUsed = currentKey;
  }
  return clientInstance;
};

// Local storage seed & cache for ultra-fast load and zero-flicker resilience
const LOCAL_CACHE_KEY = 'dropthan_leadlens_cached_leads';

const SEED_FALLBACK_LEADS: LeadRecord[] = [
  {
    id: 'f1a9b8c7-4321-4def-9876-000000000001',
    brand_id: LEADLENS_BRAND_ID,
    visitor_name: 'Rahul Sharma (Organic Trader)',
    phone_number: '+91 98765 43210',
    email: 'rahul.sharma@agroexports.in',
    clicked_item: 'Organic Ashwagandha Root 100kg Bulk',
    status: 'Abandoned',
    created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  },
  {
    id: 'f1a9b8c7-4321-4def-9876-000000000002',
    brand_id: LEADLENS_BRAND_ID,
    visitor_name: 'Priya Patel (Wholesale Buyer)',
    phone_number: '+91 91234 56789',
    email: 'priya.wholesales@gmail.com',
    clicked_item: 'A2 Desi Gir Cow Ghee (Tin 15kg)',
    status: 'Abandoned',
    created_at: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
  },
  {
    id: 'f1a9b8c7-4321-4def-9876-000000000003',
    brand_id: LEADLENS_BRAND_ID,
    visitor_name: 'Amit Verma (Dropshipper)',
    phone_number: '+91 88990 01122',
    email: 'amit.resell@dropship.co',
    clicked_item: 'Kashmiri Saffron Grade A++ (50g)',
    status: 'Contacted',
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
  {
    id: 'f1a9b8c7-4321-4def-9876-000000000004',
    brand_id: LEADLENS_BRAND_ID,
    visitor_name: 'Suresh Kumar (Exporter)',
    phone_number: '+91 94447 12345',
    email: 'suresh@chennaispices.com',
    clicked_item: 'Organic Turmeric Finger Curcumin 5% (500kg)',
    status: 'Recovered',
    created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
];

export const getCachedLeads = (): LeadRecord[] => {
  if (typeof window === 'undefined') return SEED_FALLBACK_LEADS;
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(SEED_FALLBACK_LEADS));
      return SEED_FALLBACK_LEADS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_FALLBACK_LEADS;
  } catch {
    return SEED_FALLBACK_LEADS;
  }
};

export const saveCachedLeads = (leads: LeadRecord[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(leads));
  } catch (e) {
    console.warn('Could not cache leads:', e);
  }
};

/**
 * Fetch all leads from Supabase `public.leads` for brand_id
 */
export const fetchLeadsFromSupabase = async (): Promise<{ leads: LeadRecord[]; error?: string }> => {
  try {
    const client = getLeadLensSupabase();
    const { data, error } = await client
      .from('leads')
      .select('*')
      .eq('brand_id', LEADLENS_BRAND_ID)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch leads notice:', error.message);
      // Return cached leads if table does not yet exist or has RLS error
      return { leads: getCachedLeads(), error: error.message };
    }

    if (data && data.length > 0) {
      saveCachedLeads(data as LeadRecord[]);
      return { leads: data as LeadRecord[] };
    }

    // If query succeeded but 0 records in remote, return current cached or empty
    const currentCached = getCachedLeads();
    return { leads: currentCached };
  } catch (err: any) {
    console.warn('fetchLeadsFromSupabase exception:', err);
    return { leads: getCachedLeads(), error: err?.message || 'Network exception' };
  }
};

/**
 * Insert new lead into Supabase `public.leads`
 */
export const insertLeadToSupabase = async (
  lead: Omit<LeadRecord, 'id' | 'created_at'> & { id?: string; created_at?: string }
): Promise<{ lead: LeadRecord | null; error?: string }> => {
  const newLead: LeadRecord = {
    id: lead.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ll_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
    brand_id: lead.brand_id || LEADLENS_BRAND_ID,
    visitor_name: lead.visitor_name || 'Anonymous Visitor',
    phone_number: lead.phone_number || '',
    email: lead.email || '',
    clicked_item: lead.clicked_item || 'Direct Storefront Inquiry',
    status: lead.status || 'Abandoned',
    created_at: lead.created_at || new Date().toISOString(),
  };

  // Optimistically update local cache
  const cached = getCachedLeads();
  const exists = cached.some((l) => l.id === newLead.id);
  const updatedCache = exists ? cached.map((l) => (l.id === newLead.id ? newLead : l)) : [newLead, ...cached];
  saveCachedLeads(updatedCache);

  try {
    const client = getLeadLensSupabase();
    const { data, error } = await client
      .from('leads')
      .insert([
        {
          id: newLead.id,
          brand_id: newLead.brand_id,
          visitor_name: newLead.visitor_name,
          phone_number: newLead.phone_number,
          email: newLead.email,
          clicked_item: newLead.clicked_item,
          status: newLead.status,
          created_at: newLead.created_at,
        },
      ])
      .select()
      .single();

    if (error) {
      console.warn('Failed to insert lead into remote Supabase (check SQL setup):', error.message);
      return { lead: newLead, error: error.message };
    }

    return { lead: (data as LeadRecord) || newLead };
  } catch (err: any) {
    console.warn('insertLeadToSupabase exception:', err);
    return { lead: newLead, error: err?.message };
  }
};

/**
 * Update lead status in Supabase (e.g. 'Contacted', 'Recovered', 'Abandoned')
 */
export const updateLeadStatusInSupabase = async (
  id: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> => {
  // Update local cache
  const cached = getCachedLeads();
  const updatedCache = cached.map((lead) => (lead.id === id ? { ...lead, status: newStatus } : lead));
  saveCachedLeads(updatedCache);

  try {
    const client = getLeadLensSupabase();
    const { error } = await client
      .from('leads')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      console.warn('updateLeadStatusInSupabase error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
};

/**
 * Delete lead from Supabase
 */
export const deleteLeadFromSupabase = async (id: string): Promise<{ success: boolean; error?: string }> => {
  const cached = getCachedLeads().filter((lead) => lead.id !== id);
  saveCachedLeads(cached);

  try {
    const client = getLeadLensSupabase();
    const { error } = await client.from('leads').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
};

/**
 * Real-time subscription to `public.leads` on Supabase
 */
export const subscribeToLeadsRealtime = (
  onEvent: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; lead: LeadRecord; oldId?: string }) => void,
  onStatusChange?: (status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => void
): (() => void) => {
  const client = getLeadLensSupabase();
  const channelName = `leads-live-${Date.now()}`;

  const channel: RealtimeChannel = client
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'leads',
        filter: `brand_id=eq.${LEADLENS_BRAND_ID}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT' && payload.new) {
          onEvent({ eventType: 'INSERT', lead: payload.new as LeadRecord });
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          onEvent({ eventType: 'UPDATE', lead: payload.new as LeadRecord });
        } else if (payload.eventType === 'DELETE' && payload.old) {
          onEvent({
            eventType: 'DELETE',
            lead: payload.old as LeadRecord,
            oldId: (payload.old as any).id,
          });
        }
      }
    )
    .subscribe((status) => {
      if (onStatusChange) {
        onStatusChange(status as any);
      }
    });

  return () => {
    client.removeChannel(channel);
  };
};

/**
 * Quick Test Generator: injects a realistic dropped-off lead into Supabase
 */
export const triggerTestAbandonedLead = async (): Promise<LeadRecord> => {
  const testItems = [
    'Organic Ashwagandha Wholesale 50kg Bags',
    'A2 Desi Cow Bilona Ghee (15kg Bulk Tin)',
    'Cold Pressed Castor Oil Exporters Pack (200L)',
    'Salem Pure Turmeric Powder 100kg Jute Sacks',
    'Organic Moringa Oleifera Leaf Powder (25kg)',
    'Wild Forest Raw Honey Wholesale (50kg)',
  ];

  const testNames = [
    'Sunil Narang (Gujarat Spices)',
    'Deepak Mehta (Mumbai Dry Fruits)',
    'Ananya Sen (Kolkata Herbal Co.)',
    'Karthik Raja (Chennai Agro Foods)',
    'Vikram Choudhary (Jaipur Organics)',
    'Meera Nambiar (Kerala Spices Hub)',
  ];

  const randomItem = testItems[Math.floor(Math.random() * testItems.length)];
  const randomName = testNames[Math.floor(Math.random() * testNames.length)];
  const randomPhone = `+91 ${Math.floor(7000000000 + Math.random() * 2999999999)}`;
  const cleanHandle = randomName.split(' ')[0].toLowerCase();
  const randomEmail = `${cleanHandle}.${Math.floor(10 + Math.random() * 90)}@businessmail.com`;

  const { lead } = await insertLeadToSupabase({
    brand_id: LEADLENS_BRAND_ID,
    visitor_name: randomName,
    phone_number: randomPhone,
    email: randomEmail,
    clicked_item: randomItem,
    status: 'Abandoned',
  });

  return lead!;
};
