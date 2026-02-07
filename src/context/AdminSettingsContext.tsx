import React, { createContext, useContext, useState, useEffect } from 'react';

interface ListItem {
  id: string;
  value: string;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'sales' | 'design' | 'costing' | 'admin';
  password: string;
}

interface AdminSettingsContextType {
  // Lists
  applicationVehicles: ListItem[];
  countries: ListItem[];
  brakeTypes: ListItem[];
  brakeSizes: ListItem[];
  brakePowerTypes: ListItem[];
  brakeCertificates: ListItem[];
  mainBodySectionTypes: ListItem[];
  clientSealingRequests: ListItem[];
  cupLogoOptions: ListItem[];
  suspensions: ListItem[];
  repeatabilityTypes: ListItem[];
  expectedDeliveryOptions: ListItem[];
  workingConditions: ListItem[];
  usageTypes: ListItem[];
  environments: ListItem[];
  // Product Type Lists
  axleLocations: ListItem[];
  articulationTypes: ListItem[];
  configurationTypes: ListItem[];
  addListItem: (category: ListCategory, value: string) => Promise<ListItem>;
  updateListItem: (category: ListCategory, id: string, value: string) => Promise<ListItem>;
  deleteListItem: (category: ListCategory, id: string) => Promise<void>;
  reorderListItems: (category: ListCategory, orderedIds: string[]) => Promise<void>;
  // Users
  users: UserItem[];
  setUsers: React.Dispatch<React.SetStateAction<UserItem[]>>;
}

const AdminSettingsContext = createContext<AdminSettingsContextType | undefined>(undefined);

const DEFAULT_DATA = {
  applicationVehicles: [
    { id: '1', value: 'Agricultural Trailer' },
    { id: '2', value: 'Construction Equipment Trailer' },
    { id: '3', value: 'Forestry Trailer' },
    { id: '4', value: 'GSE' },
    { id: '5', value: 'Baler' },
  ],
  countries: [
    { id: '1', value: 'China' },
    { id: '2', value: 'France' },
    { id: '3', value: 'India' },
    { id: '4', value: 'Vietnam' },
    { id: '5', value: 'Australia' },
    { id: '6', value: 'New-Zealand' },
    { id: '7', value: 'Canada' },
    { id: '8', value: 'Argentina' },
    { id: '9', value: 'Brazil' },
    { id: '10', value: 'Chili' },
    { id: '11', value: 'Spain' },
  ],
  brakeTypes: [
    { id: '1', value: 'Drum' },
    { id: '2', value: 'Disk' },
    { id: '3', value: 'N/A' },
    { id: '4', value: 'As per ROC Standard' },
  ],
  brakeSizes: [
    { id: '1', value: '180x32' },
    { id: '2', value: '250x50' },
    { id: '3', value: '300x60' },
    { id: '4', value: '400x80' },
    { id: '5', value: 'N/A' },
  ],
  brakePowerTypes: [
    { id: '1', value: 'Air' },
    { id: '2', value: 'Hydraulic' },
  ],
  brakeCertificates: [
    { id: '1', value: 'Required' },
    { id: '2', value: 'Not required' },
  ],
  mainBodySectionTypes: [
    { id: '1', value: 'Round' },
    { id: '2', value: 'Square' },
    { id: '3', value: 'Tube' },
    { id: '4', value: 'As per ROC Standard' },
  ],
  clientSealingRequests: [
    { id: '1', value: 'Steel' },
    { id: '2', value: 'Rubber' },
    { id: '3', value: 'N/A' },
    { id: '4', value: 'As per ROC Standard' },
  ],
  cupLogoOptions: [
    { id: '1', value: 'Keep' },
    { id: '2', value: 'Remove' },
    { id: '3', value: 'As per ROC Standard' },
  ],
  suspensions: [
    { id: '1', value: 'Air suspension' },
    { id: '2', value: 'Leaf spring' },
    { id: '3', value: 'Hydraulic' },
    { id: '4', value: 'PS-ROC' },
    { id: '5', value: 'V-ROC' },
    { id: '6', value: 'N/A' },
    { id: '7', value: 'As per ROC Standard' },
  ],
  repeatabilityTypes: [
    { id: '1', value: 'One-off Prototype' },
    { id: '2', value: 'Small batch' },
    { id: '3', value: 'Regular series' },
    { id: '4', value: 'Long Term Program' },
  ],
  expectedDeliveryOptions: [
    { id: '1', value: 'Exploded 3D' },
    { id: '2', value: '2D sales drawing' },
    { id: '3', value: 'Feasibility confirmation' },
    { id: '4', value: 'Recommend Appropriate Solution' },
    { id: '5', value: 'Price Quote' },
  ],
  workingConditions: [
    { id: '1', value: 'Dry' },
    { id: '2', value: 'Wet' },
    { id: '3', value: 'Under Water' },
  ],
  usageTypes: [
    { id: '1', value: 'Farm field' },
    { id: '2', value: 'Tarmac' },
  ],
  environments: [
    { id: '1', value: 'Clean' },
    { id: '2', value: 'Dusty' },
  ],
  axleLocations: [
    { id: '1', value: 'Front' },
    { id: '2', value: 'Rear' },
    { id: '3', value: 'N/A' },
  ],
  articulationTypes: [
    { id: '1', value: 'Straight axle' },
    { id: '2', value: 'Steering axle' },
    { id: '3', value: 'N/A' },
  ],
  configurationTypes: [
    { id: '1', value: 'Tandem' },
    { id: '2', value: 'Tridem' },
    { id: '3', value: 'Boggie' },
    { id: '4', value: 'Industrial Axles' },
    { id: '5', value: 'Stud Axles' },
    { id: '6', value: 'Single Axles' },
  ],
  users: [
    { id: '1', name: 'Renaud', email: 'r.molinier@sonasia.monroc.com', role: 'admin' as const, password: '4689' },
    { id: '2', name: 'Leo', email: 'leo@sonasia.monroc.com', role: 'sales' as const, password: 'K987' },
    { id: '3', name: 'Kevin', email: 'kevin@sonasia.monroc.com', role: 'sales' as const, password: 'K123' },
    { id: '4', name: 'Phoebe', email: 'phoebe@sonasia.monroc.com', role: 'design' as const, password: 'P123' },
    { id: '5', name: 'Bai', email: 'bairumei@sonasia.monroc.com', role: 'costing' as const, password: 'B345' },
    { id: '6', name: 'ZhaoHe', email: 'zhaohe@sonasia.monroc.com', role: 'design' as const, password: 'Z678' },
  ],
};

const STORAGE_KEY_V5 = 'monroc_admin_settings_v5';
const LEGACY_STORAGE_KEY = 'monroc_admin_settings_v4';

export type ListCategory =
  | 'applicationVehicles'
  | 'countries'
  | 'brakeTypes'
  | 'brakeSizes'
  | 'brakePowerTypes'
  | 'brakeCertificates'
  | 'mainBodySectionTypes'
  | 'clientSealingRequests'
  | 'cupLogoOptions'
  | 'suspensions'
  | 'repeatabilityTypes'
  | 'expectedDeliveryOptions'
  | 'workingConditions'
  | 'usageTypes'
  | 'environments'
  | 'axleLocations'
  | 'articulationTypes'
  | 'configurationTypes';

const API_BASE = '/api/admin/lists';

const isValidUsers = (v: unknown): v is UserItem[] =>
  Array.isArray(v) && v.every((x) => x && typeof x === 'object' && 'id' in (x as any) && 'email' in (x as any) && 'role' in (x as any));

const normalizeEmail = (email: unknown) => String(email ?? '').trim().toLowerCase();

const hasAllHardcodedUsers = (users: UserItem[]) => {
  const requiredEmails = new Set(DEFAULT_DATA.users.map((u) => normalizeEmail(u.email)));
  const actualEmails = new Set(users.map((u) => normalizeEmail(u.email)));
  for (const e of requiredEmails) {
    if (!actualEmails.has(e)) return false;
  }
  return true;
};

const loadUsersFromStorage = (): UserItem[] => {
  try {
    const v5 = localStorage.getItem(STORAGE_KEY_V5);
    if (v5) {
      const parsed = JSON.parse(v5);
      const rawUsers = isValidUsers(parsed?.users) ? parsed.users : DEFAULT_DATA.users;
      return hasAllHardcodedUsers(rawUsers) ? rawUsers : DEFAULT_DATA.users;
    }

    // Migration path from older key
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      const rawUsers = isValidUsers(parsed?.users) ? parsed.users : DEFAULT_DATA.users;
      const users = hasAllHardcodedUsers(rawUsers) ? rawUsers : DEFAULT_DATA.users;
      localStorage.setItem(STORAGE_KEY_V5, JSON.stringify({ users }));
      return users;
    }
  } catch (e) {
    console.error('Failed to load admin settings from storage:', e);
  }

  return DEFAULT_DATA.users;
};

const mergeDefaultList = (list: ListItem[] | undefined, defaults: ListItem[]) => {
  const safeList = Array.isArray(list) ? list : [];
  if (!safeList.length) return defaults;
  const seen = new Set(safeList.map((item) => item.value.trim().toLowerCase()));
  const merged = [...safeList];
  defaults.forEach((item) => {
    const key = item.value.trim().toLowerCase();
    if (!seen.has(key)) {
      merged.push(item);
    }
  });
  return merged;
};

export const AdminSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [applicationVehicles, setApplicationVehicles] = useState<ListItem[]>(DEFAULT_DATA.applicationVehicles);
  const [countries, setCountries] = useState<ListItem[]>(DEFAULT_DATA.countries);
  const [brakeTypes, setBrakeTypes] = useState<ListItem[]>(DEFAULT_DATA.brakeTypes);
  const [brakeSizes, setBrakeSizes] = useState<ListItem[]>(DEFAULT_DATA.brakeSizes);
  const [brakePowerTypes, setBrakePowerTypes] = useState<ListItem[]>(DEFAULT_DATA.brakePowerTypes);
  const [brakeCertificates, setBrakeCertificates] = useState<ListItem[]>(DEFAULT_DATA.brakeCertificates);
  const [mainBodySectionTypes, setMainBodySectionTypes] = useState<ListItem[]>(DEFAULT_DATA.mainBodySectionTypes);
  const [clientSealingRequests, setClientSealingRequests] = useState<ListItem[]>(DEFAULT_DATA.clientSealingRequests);
  const [cupLogoOptions, setCupLogoOptions] = useState<ListItem[]>(DEFAULT_DATA.cupLogoOptions);
  const [suspensions, setSuspensions] = useState<ListItem[]>(DEFAULT_DATA.suspensions);
  const [repeatabilityTypes, setRepeatabilityTypes] = useState<ListItem[]>(DEFAULT_DATA.repeatabilityTypes);
  const [expectedDeliveryOptions, setExpectedDeliveryOptions] = useState<ListItem[]>(DEFAULT_DATA.expectedDeliveryOptions);
  const [workingConditions, setWorkingConditions] = useState<ListItem[]>(DEFAULT_DATA.workingConditions);
  const [usageTypes, setUsageTypes] = useState<ListItem[]>(DEFAULT_DATA.usageTypes);
  const [environments, setEnvironments] = useState<ListItem[]>(DEFAULT_DATA.environments);
  const [axleLocations, setAxleLocations] = useState<ListItem[]>(DEFAULT_DATA.axleLocations);
  const [articulationTypes, setArticulationTypes] = useState<ListItem[]>(DEFAULT_DATA.articulationTypes);
  const [configurationTypes, setConfigurationTypes] = useState<ListItem[]>(DEFAULT_DATA.configurationTypes);
  const [users, setUsers] = useState<UserItem[]>(loadUsersFromStorage());

  const fetchJson = async <T,>(input: RequestInfo, init?: RequestInit): Promise<T> => {
    const res = await fetch(input, init);
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }
    return res.json() as Promise<T>;
  };

  const getListState = (category: ListCategory): [ListItem[], React.Dispatch<React.SetStateAction<ListItem[]>>] => {
    switch (category) {
      case 'applicationVehicles':
        return [applicationVehicles, setApplicationVehicles];
      case 'countries':
        return [countries, setCountries];
      case 'brakeTypes':
        return [brakeTypes, setBrakeTypes];
      case 'brakeSizes':
        return [brakeSizes, setBrakeSizes];
      case 'brakePowerTypes':
        return [brakePowerTypes, setBrakePowerTypes];
      case 'brakeCertificates':
        return [brakeCertificates, setBrakeCertificates];
      case 'mainBodySectionTypes':
        return [mainBodySectionTypes, setMainBodySectionTypes];
      case 'clientSealingRequests':
        return [clientSealingRequests, setClientSealingRequests];
      case 'cupLogoOptions':
        return [cupLogoOptions, setCupLogoOptions];
      case 'suspensions':
        return [suspensions, setSuspensions];
      case 'repeatabilityTypes':
        return [repeatabilityTypes, setRepeatabilityTypes];
      case 'expectedDeliveryOptions':
        return [expectedDeliveryOptions, setExpectedDeliveryOptions];
      case 'workingConditions':
        return [workingConditions, setWorkingConditions];
      case 'usageTypes':
        return [usageTypes, setUsageTypes];
      case 'environments':
        return [environments, setEnvironments];
      case 'axleLocations':
        return [axleLocations, setAxleLocations];
      case 'articulationTypes':
        return [articulationTypes, setArticulationTypes];
      case 'configurationTypes':
        return [configurationTypes, setConfigurationTypes];
      default:
        return [[], () => {}];
    }
  };

  useEffect(() => {
    let isActive = true;
    fetchJson<Record<ListCategory, ListItem[]>>(API_BASE)
      .then((lists) => {
        if (!isActive) return;
        setApplicationVehicles(lists.applicationVehicles ?? DEFAULT_DATA.applicationVehicles);
        setCountries(lists.countries ?? DEFAULT_DATA.countries);
        setBrakeTypes(lists.brakeTypes ?? DEFAULT_DATA.brakeTypes);
        setBrakeSizes(lists.brakeSizes ?? DEFAULT_DATA.brakeSizes);
        setBrakePowerTypes(mergeDefaultList(lists.brakePowerTypes, DEFAULT_DATA.brakePowerTypes));
        setBrakeCertificates(mergeDefaultList(lists.brakeCertificates, DEFAULT_DATA.brakeCertificates));
        setMainBodySectionTypes(mergeDefaultList(lists.mainBodySectionTypes, DEFAULT_DATA.mainBodySectionTypes));
        setClientSealingRequests(mergeDefaultList(lists.clientSealingRequests, DEFAULT_DATA.clientSealingRequests));
        setCupLogoOptions(mergeDefaultList(lists.cupLogoOptions, DEFAULT_DATA.cupLogoOptions));
        setSuspensions(lists.suspensions ?? DEFAULT_DATA.suspensions);
        setRepeatabilityTypes(lists.repeatabilityTypes ?? DEFAULT_DATA.repeatabilityTypes);
        setExpectedDeliveryOptions(lists.expectedDeliveryOptions ?? DEFAULT_DATA.expectedDeliveryOptions);
        setWorkingConditions(lists.workingConditions ?? DEFAULT_DATA.workingConditions);
        setUsageTypes(mergeDefaultList(lists.usageTypes, DEFAULT_DATA.usageTypes));
        setEnvironments(lists.environments ?? DEFAULT_DATA.environments);
        setAxleLocations(lists.axleLocations ?? DEFAULT_DATA.axleLocations);
        setArticulationTypes(lists.articulationTypes ?? DEFAULT_DATA.articulationTypes);
        setConfigurationTypes(lists.configurationTypes ?? DEFAULT_DATA.configurationTypes);
      })
      .catch((error) => {
        console.error('Failed to load admin lists:', error);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const addListItem = async (category: ListCategory, value: string) => {
    const created = await fetchJson<ListItem>(`${API_BASE}/${category}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    const [, setList] = getListState(category);
    setList((prev) => [...prev, created]);
    return created;
  };

  const updateListItem = async (category: ListCategory, id: string, value: string) => {
    const updated = await fetchJson<ListItem>(`${API_BASE}/${category}/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    const [, setList] = getListState(category);
    setList((prev) => prev.map((item) => (item.id === id ? updated : item)));
    return updated;
  };

  const deleteListItem = async (category: ListCategory, id: string) => {
    await fetch(`${API_BASE}/${category}/${id}`, { method: 'DELETE' });
    const [, setList] = getListState(category);
    setList((prev) => prev.filter((item) => item.id !== id));
  };

  const reorderListItems = async (category: ListCategory, orderedIds: string[]) => {
    const [, setList] = getListState(category);

    // Optimistic reorder based on the ids from the UI.
    setList((prev) => {
      const byId = new Map(prev.map((i) => [i.id, i]));
      const next: ListItem[] = [];
      const seen = new Set<string>();

      for (const id of orderedIds) {
        const item = byId.get(id);
        if (!item) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        next.push(item);
      }
      // Append any items not included (e.g. concurrent add).
      for (const item of prev) {
        if (seen.has(item.id)) continue;
        next.push(item);
      }
      return next;
    });

    try {
      await fetchJson<{ ok: boolean }>(`${API_BASE}/${category}/reorder`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      });
    } catch (error) {
      console.error('Failed to reorder admin list:', error);
      // Best-effort rollback: refetch server state.
      try {
        const fresh = await fetchJson<ListItem[]>(`${API_BASE}/${category}`);
        setList(fresh);
      } catch (e) {
        console.error('Failed to refetch admin list after reorder failure:', e);
      }
      throw error;
    }
  };

  // Persist users to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_V5, JSON.stringify({ users }));
  }, [users]);

  return (
    <AdminSettingsContext.Provider value={{
      applicationVehicles,
      countries,
      brakeTypes,
      brakeSizes,
      brakePowerTypes,
      brakeCertificates,
      mainBodySectionTypes,
      clientSealingRequests,
      cupLogoOptions,
      suspensions,
      repeatabilityTypes,
      expectedDeliveryOptions,
      workingConditions,
      usageTypes,
      environments,
      axleLocations,
      articulationTypes,
      configurationTypes,
      addListItem,
      updateListItem,
      deleteListItem,
      reorderListItems,
      users,
      setUsers,
    }}>
      {children}
    </AdminSettingsContext.Provider>
  );
};

export const useAdminSettings = () => {
  const context = useContext(AdminSettingsContext);
  if (context === undefined) {
    throw new Error('useAdminSettings must be used within an AdminSettingsProvider');
  }
  return context;
};

export type { ListItem, UserItem };
