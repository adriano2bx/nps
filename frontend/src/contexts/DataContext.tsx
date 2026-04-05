import React, { createContext, useContext, useState, useEffect } from 'react';
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
  topic?: {
    id: string;
    name: string;
    color: string | null;
  };
}

interface DataContextType {
  dashboard: any;
  reports: { data: any[]; pagination: any; stats: any };
  patients: { data: Contact[]; pagination: any };
  campaigns: Campaign[];
  channels: any[];
  topics: { id: string; name: string; color: string }[];
  refreshDashboard: () => Promise<void>;
  refreshReports: (page?: number, filters?: any) => Promise<void>;
  refreshPatients: (page?: number) => Promise<void>;
  refreshCampaigns: () => Promise<void>;
  refreshChannels: () => Promise<void>;
  refreshTopics: () => Promise<void>;
  loading: { dashboard: boolean; reports: boolean; patients: boolean; campaigns: boolean; channels: boolean; topics: boolean };
  isRefreshing: { dashboard: boolean; reports: boolean; patients: boolean; campaigns: boolean; channels: boolean; topics: boolean };
}


const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  
  // Request Deduplication Refs
  const fetchingRefs = React.useRef<Record<string, boolean>>({});

  const [dashboard, setDashboard] = useState<any>(null);
  const [reports, setReports] = useState<any>({ data: [], pagination: {}, stats: {} });
  const [patients, setPatients] = useState<any>({ data: [], pagination: {} });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);

  const [loading, setLoading] = useState({
    dashboard: true,
    reports: true,
    patients: true,
    campaigns: true,
    channels: true,
    topics: true
  });

  const [isRefreshing, setIsRefreshing] = useState({
    dashboard: false,
    reports: false,
    patients: false,
    campaigns: false,
    channels: false,
    topics: false
  });

  const fetchDashboard = async () => {
    if (!token || fetchingRefs.current.dashboard) return;
    fetchingRefs.current.dashboard = true;
    setIsRefreshing(prev => ({ ...prev, dashboard: true }));
    try {
      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const response = await fetch(`${apiBase}/api/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard', err);
    } finally {
      setLoading(prev => ({ ...prev, dashboard: false }));
      setIsRefreshing(prev => ({ ...prev, dashboard: false }));
      fetchingRefs.current.dashboard = false;
    }
  };

  const fetchReports = async (page = 1, filters = {}) => {
    if (!token || fetchingRefs.current.reports) return;
    fetchingRefs.current.reports = true;
    setIsRefreshing(prev => ({ ...prev, reports: true }));
    try {
      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const params = new URLSearchParams({ page: String(page), ...filters });
      const response = await fetch(`${apiBase}/api/dashboard/responses?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setLoading(prev => ({ ...prev, reports: false }));
      setIsRefreshing(prev => ({ ...prev, reports: false }));
      fetchingRefs.current.reports = false;
    }
  };

  const fetchPatients = async (page = 1) => {
    if (!token || fetchingRefs.current.patients) return;
    fetchingRefs.current.patients = true;
    setIsRefreshing(prev => ({ ...prev, patients: true }));
    try {
      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const response = await fetch(`${apiBase}/api/contacts?page=${page}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      }
    } catch (err) {
      console.error('Failed to fetch patients', err);
    } finally {
      setLoading(prev => ({ ...prev, patients: false }));
      setIsRefreshing(prev => ({ ...prev, patients: false }));
      fetchingRefs.current.patients = false;
    }
  };

  const fetchCampaigns = async () => {
    if (!token || fetchingRefs.current.campaigns) return;
    fetchingRefs.current.campaigns = true;
    setIsRefreshing(prev => ({ ...prev, campaigns: true }));
    try {
      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const response = await fetch(`${apiBase}/api/campaigns`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error('Failed to fetch campaigns', err);
    } finally {
      setLoading(prev => ({ ...prev, campaigns: false }));
      setIsRefreshing(prev => ({ ...prev, campaigns: false }));
      fetchingRefs.current.campaigns = false;
    }
  };

  const fetchChannels = async () => {
    if (!token || fetchingRefs.current.channels) return;
    fetchingRefs.current.channels = true;
    setIsRefreshing(prev => ({ ...prev, channels: true }));
    try {
      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const response = await fetch(`${apiBase}/api/channels`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setChannels(data);
      }
    } catch (err) {
      console.error('Failed to fetch channels', err);
    } finally {
      setLoading(prev => ({ ...prev, channels: false }));
      setIsRefreshing(prev => ({ ...prev, channels: false }));
      fetchingRefs.current.channels = false;
    }
  };

  const fetchTopics = async () => {
    if (!token || fetchingRefs.current.topics) return;
    fetchingRefs.current.topics = true;
    setIsRefreshing(prev => ({ ...prev, topics: true }));
    try {
      const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
      const response = await fetch(`${apiBase}/api/topics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTopics(data);
      }
    } catch (err) {
      console.error('Failed to fetch topics', err);
    } finally {
      setLoading(prev => ({ ...prev, topics: false }));
      setIsRefreshing(prev => ({ ...prev, topics: false }));
      fetchingRefs.current.topics = false;
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboard();
      fetchReports();
      fetchPatients();
      fetchCampaigns();
      fetchChannels();
      fetchTopics();
    } else {
      setDashboard(null);
      setReports({ data: [], pagination: {}, stats: {} });
      setPatients({ data: [], pagination: {} });
      setCampaigns([]);
      setChannels([]);
      setTopics([]);
      setLoading({
        dashboard: false,
        reports: false,
        patients: false,
        campaigns: false,
        channels: false,
        topics: false
      });
    }
  }, [token]);

  const value = {
    dashboard,
    reports,
    patients,
    campaigns,
    channels,
    topics,
    refreshDashboard: fetchDashboard,
    refreshReports: fetchReports,
    refreshPatients: fetchPatients,
    refreshCampaigns: fetchCampaigns,
    refreshChannels: fetchChannels,
    refreshTopics: fetchTopics,
    loading,
    isRefreshing
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
