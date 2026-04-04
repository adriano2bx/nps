import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  optOut: boolean;
  isMasked: boolean;
  lastActive: string;
  segments: { id: string; name: string; color: string }[];
}

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  triggerType: string;
  _count?: {
    questions: number;
    sessions: number;
  };
}

interface DataContextType {
  dashboard: any;
  reports: { data: any[]; pagination: any; stats: any };
  patients: { data: Contact[]; pagination: any };
  campaigns: Campaign[];
  channels: any[];
  refreshDashboard: () => Promise<void>;
  refreshReports: (page?: number, filters?: any) => Promise<void>;
  refreshPatients: (page?: number) => Promise<void>;
  refreshCampaigns: () => Promise<void>;
  refreshChannels: () => Promise<void>;
  loading: { dashboard: boolean; reports: boolean; patients: boolean; campaigns: boolean; channels: boolean };
  isRefreshing: { dashboard: boolean; reports: boolean; patients: boolean; campaigns: boolean; channels: boolean };
}


const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  
  // Request Deduplication Refs
  const fetchingRefs = React.useRef<Record<string, boolean>>({});

  const [dashboard, setDashboard] = useState<any>(null);
  const [reports, setReports] = useState({ data: [], pagination: { total: 0, page: 1, limit: 10, pages: 1 }, stats: null });
  const [patients, setPatients] = useState<{ data: Contact[]; pagination: any }>({ data: [], pagination: { total: 0, page: 1, limit: 10, pages: 0 } });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const [channels, setChannels] = useState<any[]>([]);
  
  const [loading, setLoading] = useState({ 
    dashboard: true, reports: true, patients: true, campaigns: true, channels: true 
  });
  const [isRefreshing, setIsRefreshing] = useState({ 
    dashboard: false, reports: false, patients: false, campaigns: false, channels: false 
  });

  const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

  const fetchDashboard = useCallback(async () => {
    if (!token) return;
    
    const resourceKey = 'dashboard';
    if (fetchingRefs.current[resourceKey]) return;
    fetchingRefs.current[resourceKey] = true;

    setIsRefreshing(prev => ({ ...prev, dashboard: true }));
    try {
      const res = await fetch(`${apiBase}/api/reports/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
        localStorage.setItem('nps_dashboard_cache', JSON.stringify(data));
      }
    } catch (err) {
      console.error('DataCtx Dashboard Error:', err);
    } finally {
      fetchingRefs.current[resourceKey] = false;
      setLoading(prev => ({ ...prev, dashboard: false }));
      setIsRefreshing(prev => ({ ...prev, dashboard: false }));
    }
  }, [token, apiBase]);

  const fetchReports = useCallback(async (page = 1, filters = { campaign: 'all', scoreCategory: 'all' }) => {
    if (!token) return;

    const resourceKey = `reports:${page}:${JSON.stringify(filters)}`;
    if (fetchingRefs.current[resourceKey]) return;
    fetchingRefs.current[resourceKey] = true;

    setIsRefreshing(prev => ({ ...prev, reports: true }));
    try {
      const queryParams = new URLSearchParams();
      if (filters && filters.campaign !== 'all') queryParams.append('campaignId', filters.campaign);
      if (filters && filters.scoreCategory !== 'all') queryParams.append('scoreCategory', filters.scoreCategory);
      queryParams.append('page', page.toString());
      queryParams.append('limit', '10');

      // Fetch Detailed and Stats in Parallel
      const [resDetailed, resStats] = await Promise.all([
        fetch(`${apiBase}/api/reports/detailed?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${apiBase}/api/reports/stats?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (resDetailed.ok && resStats.ok) {
        const dataDetailed = await resDetailed.json();
        const dataStats = await resStats.json();
        
        const mapped = { 
          data: dataDetailed.responses.map((r: any) => ({
             id: r.id,
             name: r.contactName || 'Anônimo',
             phone: r.contactPhone || '',
             campaign: r.campaignName || '—',
             score: r.score ?? 0,
             response: r.comment || '',
             date: r.createdAt,
             isMasked: !!r.isMasked
          })), 
          pagination: dataDetailed.pagination,
          stats: dataStats
        };
        setReports(mapped);
        localStorage.setItem('nps_reports_cache', JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('DataCtx Reports Error:', err);
    } finally {
      fetchingRefs.current[resourceKey] = false;
      setLoading(prev => ({ ...prev, reports: false }));
      setIsRefreshing(prev => ({ ...prev, reports: false }));
    }
  }, [token, apiBase]);

  const fetchPatients = useCallback(async (page = 1) => {
    if (!token) return;

    const resourceKey = `patients:${page}`;
    if (fetchingRefs.current[resourceKey]) return;
    fetchingRefs.current[resourceKey] = true;

    setIsRefreshing(prev => ({ ...prev, patients: true }));
    try {
      const res = await fetch(`${apiBase}/api/contacts?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = { data: data.contacts, pagination: data.pagination };
        setPatients(mapped);
        localStorage.setItem('nps_patients_cache', JSON.stringify(mapped));
      }
    } catch (err) {
      console.error('DataCtx Patients Error:', err);
    } finally {
      fetchingRefs.current[resourceKey] = false;
      setLoading(prev => ({ ...prev, patients: false }));
      setIsRefreshing(prev => ({ ...prev, patients: false }));
    }
  }, [token, apiBase]);

  const fetchCampaigns = useCallback(async () => {
    if (!token) return;
    setIsRefreshing(prev => ({ ...prev, campaigns: true }));
    try {
      const res = await fetch(`${apiBase}/api/campaigns`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
        localStorage.setItem('nps_campaigns_cache', JSON.stringify(data));
      }
    } catch (err) {
      console.error('DataCtx Campaigns Error:', err);
    } finally {
      setLoading(prev => ({ ...prev, campaigns: false }));
      setIsRefreshing(prev => ({ ...prev, campaigns: false }));
    }
  }, [token, apiBase]);

  const fetchChannels = useCallback(async () => {
    if (!token) return;
    setIsRefreshing(prev => ({ ...prev, channels: true }));
    try {
      const res = await fetch(`${apiBase}/api/channels`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
        localStorage.setItem('nps_channels_cache', JSON.stringify(data));
      }
    } catch (err) {
      console.error('DataCtx Channels Error:', err);
    } finally {
      setLoading(prev => ({ ...prev, channels: false }));
      setIsRefreshing(prev => ({ ...prev, channels: false }));
    }
  }, [token, apiBase]);

  // Initial Boot Sequence: Load all caches FIRST, then fetch fresh data
  useEffect(() => {
    if (token) {
      // 1. Load Caches
      const dashCached = localStorage.getItem('nps_dashboard_cache');
      if (dashCached) setDashboard(JSON.parse(dashCached));

      const reportsCached = localStorage.getItem('nps_reports_cache');
      if (reportsCached) setReports(JSON.parse(reportsCached));

      const patientsCached = localStorage.getItem('nps_patients_cache');
      if (patientsCached) setPatients(JSON.parse(patientsCached));

      const campaignsCached = localStorage.getItem('nps_campaigns_cache');
      if (campaignsCached) setCampaigns(JSON.parse(campaignsCached));

      const channelsCached = localStorage.getItem('nps_channels_cache');
      if (channelsCached) setChannels(JSON.parse(channelsCached));

      // 2. Fetch Fresh Data (Parallel)
      fetchDashboard();
      fetchReports(1);
      fetchPatients(1);
      fetchCampaigns();
      fetchChannels();
    }
  }, [token, fetchDashboard, fetchReports, fetchPatients, fetchCampaigns, fetchChannels]);

  return (
    <DataContext.Provider value={{ 
      dashboard, 
      reports, 
      patients,
      campaigns,
      channels,
      refreshDashboard: fetchDashboard,
      refreshReports: fetchReports,
      refreshPatients: fetchPatients,
      refreshCampaigns: fetchCampaigns,
      refreshChannels: fetchChannels,
      loading,
      isRefreshing
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
};
