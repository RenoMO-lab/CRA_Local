import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CustomerRequest, RequestStatus } from '@/types';
import { useAuth } from './AuthContext';

interface RequestContextType {
  requests: CustomerRequest[];
  isLoading: boolean;
  getRequestById: (id: string) => CustomerRequest | undefined;
  createRequest: (request: Omit<CustomerRequest, 'id' | 'createdAt' | 'updatedAt' | 'history' | 'createdBy' | 'createdByName'>) => Promise<CustomerRequest>;
  updateRequest: (id: string, updates: Partial<CustomerRequest>) => Promise<void>;
  updateStatus: (id: string, status: RequestStatus, comment?: string) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
}

const RequestContext = createContext<RequestContextType | undefined>(undefined);

const API_BASE = '/api/requests';

const reviveRequest = (r: any): CustomerRequest => ({
  ...r,
  createdAt: r?.createdAt ? new Date(r.createdAt) : new Date(),
  updatedAt: r?.updatedAt ? new Date(r.updatedAt) : new Date(),
  expectedDesignReplyDate: r?.expectedDesignReplyDate ? new Date(r.expectedDesignReplyDate) : undefined,
  expectedDeliverySelections: Array.isArray(r?.expectedDeliverySelections) ? r.expectedDeliverySelections : [],
  attachments: Array.isArray(r?.attachments)
    ? r.attachments.map((a: any) => ({
        ...a,
        uploadedAt: a?.uploadedAt ? new Date(a.uploadedAt) : new Date(),
      }))
    : [],
  history: Array.isArray(r?.history)
    ? r.history.map((h: any) => ({
        ...h,
        timestamp: h?.timestamp ? new Date(h.timestamp) : new Date(),
      }))
    : [],
});

const fetchJson = async <T,>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const res = await fetch(input, init);
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
};

export const RequestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchJson<CustomerRequest[]>(API_BASE);
      setRequests(data.map(reviveRequest));
    } catch (e) {
      console.error('Failed to load requests:', e);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let intervalId: number | undefined;

    const startPolling = () => {
      if (intervalId) return;
      refreshRequests();
      intervalId = window.setInterval(() => {
        if (document.visibilityState === "visible") {
          refreshRequests();
        }
      }, 30_000);
    };

    const stopPolling = () => {
      if (intervalId) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        startPolling();
      } else {
        stopPolling();
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", startPolling);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", startPolling);
    };
  }, [refreshRequests]);

  const getRequestById = useCallback((id: string) => {
    return requests.find(r => r.id === id);
  }, [requests]);

  const createRequest = useCallback(async (requestData: Omit<CustomerRequest, 'id' | 'createdAt' | 'updatedAt' | 'history' | 'createdBy' | 'createdByName'>) => {
    const payload = {
      ...requestData,
      createdBy: user?.id || '',
      createdByName: user?.name || '',
    };

    const created = await fetchJson<CustomerRequest>(API_BASE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const revived = reviveRequest(created);
    setRequests(prev => [...prev, revived]);
    return revived;
  }, [user]);

  const updateRequest = useCallback(async (id: string, updates: Partial<CustomerRequest>) => {
    const updated = await fetchJson<CustomerRequest>(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(updates),
    });

    const revived = reviveRequest(updated);
    setRequests(prev => prev.map(r => (r.id === id ? revived : r)));
  }, []);

  const updateStatus = useCallback(async (id: string, status: RequestStatus, comment?: string) => {
    const updated = await fetchJson<CustomerRequest>(`${API_BASE}/${id}/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        status,
        comment,
        userId: user?.id || '',
        userName: user?.name || '',
      }),
    });

    const revived = reviveRequest(updated);
    setRequests(prev => prev.map(r => (r.id === id ? revived : r)));
  }, [user]);

  const deleteRequest = useCallback(async (id: string) => {
    await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    setRequests(prev => prev.filter(r => r.id !== id));
  }, []);

  return (
    <RequestContext.Provider value={{
      requests,
      isLoading,
      getRequestById,
      createRequest,
      updateRequest,
      updateStatus,
      deleteRequest,
    }}>
      {children}
    </RequestContext.Provider>
  );
};

export const useRequests = () => {
  const context = useContext(RequestContext);
  if (context === undefined) {
    throw new Error('useRequests must be used within a RequestProvider');
  }
  return context;
};
