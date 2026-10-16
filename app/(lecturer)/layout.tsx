'use client';

import LecturerHeader from '@/components/lecturer/LecturerHeader';
import LecturerSidebar from '@/components/lecturer/LecturerSidebar';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, clearAuthSession } from '@/lib/api';
import { CommunicationProvider } from '@/components/communications/CommunicationProvider';
import FloatingChatBubble from '@/components/communications/FloatingChatBubble';
import LoadingPlaceholder from '@/components/ui/LoadingPlaceholder';

interface LecturerLayoutProps {
  children: React.ReactNode;
}

export default function LecturerLayout({ children }: LecturerLayoutProps) {
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [lecturer, setLecturer] = useState<{ id: string; name: string; email: string; department: string; title: string; role: 'lecturer' } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [isDragging, setIsDragging] = useState(false);
  
  const minWidth = 220;
  const maxWidth = 380;

  useEffect(() => {
    let active = true;
    api.lecturerSession()
      .then((response: { user?: typeof lecturer }) => {
        const user = response.user;
        if (!user?.id || !user.name || !user.email || user.role !== 'lecturer') {
          throw new Error('The lecturer session is invalid.');
        }
        if (!active) return;
        setLecturer(user);
        window.localStorage.setItem('rhema_user', JSON.stringify(user));
        setAuthChecked(true);
      })
      .catch((error: Error & { status?: number }) => {
        if (!active) return;
        if (error.status === 401) {
          clearAuthSession();
          router.replace('/lecturer/login');
          return;
        }
        setAuthError(error.message || 'Unable to verify the lecturer session.');
        setAuthChecked(true);
      });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    const updateLecturerProfile = (event: Event) => {
      const detail = (event as CustomEvent<Pick<NonNullable<typeof lecturer>, 'name' | 'email' | 'department' | 'title'>>).detail;
      if (detail) setLecturer((current) => current ? { ...current, ...detail } : current);
    };
    window.addEventListener('rhema-lecturer-profile-updated', updateLecturerProfile);
    return () => window.removeEventListener('rhema-lecturer-profile-updated', updateLecturerProfile);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      clearAuthSession();
      router.replace('/lecturer/login');
    }
  }, [router]);

  const stopResizing = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newWidth = e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isDragging, resize, stopResizing]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  if (!authChecked || !lecturer) {
    if (authError) {
      return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center"><p role="alert" className="max-w-lg text-sm font-semibold text-red-700">{authError}</p><button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Retry session check</button></div>;
    }
    return <LoadingPlaceholder variant="lecturer" />;
  }

  return (
    <CommunicationProvider>
    <div className="h-screen bg-slate-50/60 text-slate-800 flex overflow-hidden antialiased">
      
      {/* Mobile Sidebar Backdrop Dimmer Blur */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300 md:hidden"
        />
      )}

      {/* Primary Sidebar Navigation */}
      <LecturerSidebar 
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        sidebarWidth={sidebarWidth}
        onMouseDownResize={startResizing}
        isDragging={isDragging}
        onSignOut={() => { void signOut(); }}
      />

      {/* Main Page Content Body Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-screen relative overflow-hidden">
        
        {/* Context Header Element */}
        <LecturerHeader onMenuOpenClick={() => setIsMobileOpen(true)} lecturer={lecturer} onSignOut={signOut} />

        {/* Viewport Core Window Container 
          - Changed flex-1 to fixed heights to isolate scrolling.
          - Added scrollbar-none to suppress visual tracks.
        */}
        <main className="flex-1 h-[calc(100vh-64px)] overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-50/30 scrollbar-none">
          <div className="max-w-8xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
    <FloatingChatBubble />
    </CommunicationProvider>
  );
}