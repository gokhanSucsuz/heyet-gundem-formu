'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface Personnel {
  id: string;
  name: string;
  isAdmin: boolean;
}

interface PersonnelContextType {
  personnel: Personnel | null;
  setPersonnel: (p: Personnel | null) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const PersonnelContext = createContext<PersonnelContextType>({
  personnel: null,
  setPersonnel: () => {},
  logout: async () => {},
  isAuthenticated: false,
});

export function usePersonnel() {
  return useContext(PersonnelContext);
}

// Pages that don't require personnel auth
const PUBLIC_PATHS = ['/login', '/select-personnel', '/admin'];

export function PersonnelProvider({ children }: { children: React.ReactNode }) {
  const [personnel, setPersonnelState] = useState<Personnel | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const pageViewLogged = useRef<string>('');

  // Restore from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('personnel');
    if (stored) {
      try {
        setPersonnelState(JSON.parse(stored));
      } catch { /* ignore */ }
    }
  }, []);

  // Track page views
  useEffect(() => {
    if (personnel && pathname && pageViewLogged.current !== pathname) {
      pageViewLogged.current = pathname;
      fetch('/api/audit/page-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personnelId: personnel.id,
          personnelName: personnel.name,
          page: pathname,
          pageTitle: document.title,
        }),
      }).catch(() => {});
    }
  }, [pathname, personnel]);

  // Redirect to personnel selection if not authenticated
  useEffect(() => {
    const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
    if (!isPublic && !personnel) {
      const stored = sessionStorage.getItem('personnel');
      if (!stored) {
        router.push('/select-personnel');
      }
    }
  }, [pathname, personnel, router]);

  const setPersonnel = useCallback((p: Personnel | null) => {
    setPersonnelState(p);
    if (p) {
      sessionStorage.setItem('personnel', JSON.stringify(p));
    } else {
      sessionStorage.removeItem('personnel');
    }
  }, []);

  const logout = useCallback(async () => {
    if (personnel) {
      // Log logout
      await fetch('/api/auth/personnel-logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personnelId: personnel.id,
          personnelName: personnel.name,
        }),
      }).catch(() => {});
    }
    setPersonnel(null);
    router.push('/select-personnel');
  }, [personnel, setPersonnel, router]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (personnel) {
        // Use sendBeacon for reliable delivery during page unload
        const data = JSON.stringify({
          personnelId: personnel.id,
          personnelName: personnel.name,
        });
        navigator.sendBeacon('/api/auth/personnel-logout', data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [personnel]);

  const isAuthenticated = !!personnel;

  return (
    <PersonnelContext.Provider value={{ personnel, setPersonnel, logout, isAuthenticated }}>
      {children}
    </PersonnelContext.Provider>
  );
}
