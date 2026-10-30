'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminAudioPlayerProvider from '@/components/admin/AdminAudioPlayer';
import AdminErrorMonitor from '@/components/admin/AdminErrorMonitor';
import { CommunicationProvider } from '@/components/communications/CommunicationProvider';
import AdminNotificationToasts from '@/components/communications/AdminNotificationToasts';
import FloatingChatBubble from '@/components/communications/FloatingChatBubble';
import LoadingPlaceholder from '@/components/ui/LoadingPlaceholder';
import { api, clearAuthSession } from '@/lib/api';
import { canAccessAdminModule, getAdminLandingPath, getAdminModuleForPath } from '@/lib/admin-access';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin';
  admin_role: string;
  department: string;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isDragging, setIsDragging] = useState(false);
  const minWidth = 220;
  const maxWidth = 420;

  const getMaxSidebarWidth = useCallback(() => (
    Math.max(minWidth, Math.min(maxWidth, window.innerWidth * 0.4, window.innerWidth - 320))
  ), []);

  const clampSidebarWidth = useCallback((width: number) => (
    Math.min(getMaxSidebarWidth(), Math.max(minWidth, width))
  ), [getMaxSidebarWidth]);

  useEffect(() => {
    const initialWidthLoad = window.setTimeout(() => {
      const savedWidth = Number(window.localStorage.getItem('rhema_admin_sidebar_width'));
      if (Number.isFinite(savedWidth) && savedWidth > 0) setSidebarWidth(clampSidebarWidth(savedWidth));
    }, 0);
    const handleResize = () => setSidebarWidth((width) => clampSidebarWidth(width));
    window.addEventListener('resize', handleResize);
    return () => {
      window.clearTimeout(initialWidthLoad);
      window.removeEventListener('resize', handleResize);
    };
  }, [clampSidebarWidth]);

  useEffect(() => {
    let active = true;
    api.adminSession()
      .then((response: { user?: AdminProfile }) => {
        if (!response.user?.id
          || response.user.role !== 'admin'
          || !response.user.name
          || !response.user.email
          || !response.user.admin_role
          || !response.user.department) {
          throw new Error('The administrator session is invalid.');
        }
        if (!active) return;
        setAdminProfile(response.user);
        window.localStorage.setItem('rhema_user', JSON.stringify(response.user));
        setAuthChecked(true);
      })
      .catch((error: Error & { status?: number }) => {
        if (!active) return;
        if (error.status === 401) {
          clearAuthSession();
          router.replace('/login');
          return;
        }
        setAuthError(error.message || 'Unable to verify the administrator session.');
        setAuthChecked(true);
      });
    return () => {
      active = false;
    };
  }, [router]);

  const signOut = useCallback(async () => {
    await api.logout();
    clearAuthSession();
    router.replace('/login');
  }, [router]);

  const closeSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false);
    setIsDesktopSidebarOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    if (window.matchMedia('(min-width: 768px)').matches) {
      setIsDesktopSidebarOpen((open) => !open);
    } else {
      setIsMobileSidebarOpen((open) => !open);
    }
  }, []);

  const stopResizing = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resize = useCallback((e: PointerEvent) => {
    const newWidth = clampSidebarWidth(e.clientX);
    setSidebarWidth(newWidth);
    try {
      window.localStorage.setItem('rhema_admin_sidebar_width', String(newWidth));
    } catch (error) {
      console.error('Unable to save administrator sidebar width.', error);
    }
  }, [clampSidebarWidth]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', resize);
      window.addEventListener('pointerup', stopResizing);
      window.addEventListener('pointercancel', stopResizing);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      window.removeEventListener('pointermove', resize);
      window.removeEventListener('pointerup', stopResizing);
      window.removeEventListener('pointercancel', stopResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, resize, stopResizing]);

  useEffect(() => {
    if (adminProfile && pathname === '/admin'
      && !canAccessAdminModule(adminProfile.admin_role, adminProfile.department, 'dashboard')) {
      router.replace(getAdminLandingPath(adminProfile.admin_role));
    }
  }, [adminProfile, pathname, router]);

  const startResizing = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const resizeWithKeyboard = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const nextWidth = e.key === 'Home'
      ? minWidth
      : e.key === 'End'
        ? getMaxSidebarWidth()
        : clampSidebarWidth(sidebarWidth + (e.key === 'ArrowRight' ? 16 : -16));
    setSidebarWidth(nextWidth);
    try {
      window.localStorage.setItem('rhema_admin_sidebar_width', String(nextWidth));
    } catch (error) {
      console.error('Unable to save administrator sidebar width.', error);
    }
  }, [clampSidebarWidth, getMaxSidebarWidth, sidebarWidth]);

  if (!authChecked || !adminProfile) {
    if (authError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f6f7f4] px-6 text-center">
          <p role="alert" className="max-w-lg text-sm font-semibold text-red-700">{authError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Retry session check
          </button>
        </div>
      );
    }
    return <LoadingPlaceholder variant="admin" />;
  }

  return (
    <CommunicationProvider enabled={canAccessAdminModule(adminProfile.admin_role, adminProfile.department, 'communications')}>
    <AdminAudioPlayerProvider>
    <div
      style={{ '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
      className="admin-shell relative h-screen overflow-hidden bg-[#f6f7f4] text-[#17201d] antialiased"
    >
      <AdminErrorMonitor />
      
      {/* Mobile Drawer Dim Overlay Backdrop */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-[#17201d]/35 transition-opacity duration-300 md:hidden"
        />
      )}

      {/* Separated Sidebar Node */}
      <AdminSidebar 
        isMobileOpen={isMobileSidebarOpen}
        isDesktopOpen={isDesktopSidebarOpen}
        closeSidebar={closeSidebar}
        closeMobileSidebar={() => setIsMobileSidebarOpen(false)}
        sidebarWidth={sidebarWidth}
        onResizePointerDown={startResizing}
        onResizeKeyDown={resizeWithKeyboard}
        isDragging={isDragging}
        admin={adminProfile}
        onSignOut={signOut}
      />

      {/* Main Structural Viewport Track */}
      <div className={`relative ml-0 h-screen overflow-hidden ${isDesktopSidebarOpen ? 'md:ml-[var(--sidebar-width)]' : 'md:ml-0'}`}>
        
        {/* Separated Header Node */}
        <AdminHeader
          onMenuToggle={toggleSidebar}
          isMobileSidebarOpen={isMobileSidebarOpen}
          isDesktopSidebarOpen={isDesktopSidebarOpen}
          admin={adminProfile}
          onSignOut={signOut}
        />

        {/* Shared Work Area Content Grid Route Node */}
        <main className="h-screen overflow-y-auto no-scrollbar bg-[#f6f7f4] pt-16 md:pt-16">
          <style dangerouslySetInnerHTML={{__html: `
            .no-scrollbar::-webkit-scrollbar { display: none !important; }
          `}} />

          <div 
            className="mx-auto max-w-[1600px] space-y-6 px-4 py-5 md:px-7 md:py-7 lg:px-10"
            style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
          >
            {pathname === '/admin' && !canAccessAdminModule(adminProfile.admin_role, adminProfile.department, 'dashboard')
              ? <p className="mt-12 text-center text-sm font-semibold text-slate-500">Opening your administrator workspace...</p>
              : canAccessAdminModule(adminProfile.admin_role, adminProfile.department, getAdminModuleForPath(pathname))
              ? children
              : <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800" aria-hidden="true">!</div>
                <h1 className="mt-4 text-xl font-black text-slate-950">Access restricted</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">This section is not available to your current administrator role or department. Contact an owner or administrator if you need access.</p>
              </div>}
          </div>
        </main>
      </div>
    </div>
    {canAccessAdminModule(adminProfile.admin_role, adminProfile.department, 'communications') && <>
      <AdminNotificationToasts />
      <FloatingChatBubble />
    </>}
    </AdminAudioPlayerProvider>
    </CommunicationProvider>
  );
}