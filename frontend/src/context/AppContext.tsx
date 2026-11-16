import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/services/api';
import type { Conversation, Project, ProviderQuota, UsageSnapshot } from '@/types';

const AppContext = createContext<{
  conversations: Conversation[];
  activeConversation: Conversation | null;
  setActiveConversation: (c: Conversation | null) => void;
  projects: Project[];
  setProjects: (p: Project[]) => void;
  providerQuota: ProviderQuota[];
  usageToday: UsageSnapshot | null;
  loading: boolean;
  setLoading: (b: boolean) => void;
  refreshQuota: () => Promise<void>;
  auth: { isAuthenticated: boolean; userId: string | null };
} | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [providerQuota, setProviderQuota] = useState<ProviderQuota[]>([]);
  const [usageToday, setUsageToday] = useState<UsageSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    loadConversations();
    loadProjects();
    refreshQuota();
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.conversations();
      setConversations(Array.isArray(data) ? data : []);
    } catch {
      // backend may not be configured; conversations handled client-side via storage
      setConversations([]);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.projects();
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setProjects([]);
    }
  }, []);

  const refreshQuota = useCallback(async () => {
    try {
      const data = await api.quota();
      setProviderQuota(Array.isArray(data) ? data : []);
      if (data && typeof data === 'object' && 'usageToday' in data) {
        setUsageToday((data as any).usageToday || null);
      }
    } catch {
      setProviderQuota([]);
    }
  }, []);

  const ctx = {
    conversations,
    activeConversation,
    setActiveConversation,
    projects,
    setProjects,
    providerQuota,
    usageToday,
    loading,
    setLoading,
    refreshQuota,
    auth: { isAuthenticated: false, userId: null },
  };
  return <AppContext.Provider value={ctx}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
