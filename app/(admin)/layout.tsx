'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { AlertCircle, Loader2, LockKeyhole } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminAudioPlayerProvider from '@/components/admin/AdminAudioPlayer';
import AdminErrorMonitor from '@/components/admin/AdminErrorMonitor';
import { CommunicationProvider } from '@/components/communications/CommunicationProvider';
import AdminNotificationToasts from '@/components/communications/AdminNotificationToasts';
import FloatingChatBubble from '@/components/communications/FloatingChatBubble';
import LoadingPlaceholder from '@/components/ui/LoadingPlaceholder';
import { api, clearAuthSession } from '@/lib/api';
import { setAuthSession } from '@/lib/auth';
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

interface AdminLoginResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    admin_role: string;
    department: string;
  };
}

const ADMIN_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const ADMIN_LOCKED_KEY = 'rhema_admin_panel_locked';
const ADMIN_LAST_ACTIVITY_KEY = 'rhema_admin_panel_last_activity';
const ADMIN_LOCK_USER_KEY = 'rhema_admin_panel_lock_user';

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
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
        const now = Date.now();
        const lockUserId = window.sessionStorage.getItem(ADMIN_LOCK_USER_KEY);
        const lastActivityValue = window.sessionStorage.getItem(ADMIN_LAST_ACTIVITY_KEY);
        const lastActivityAt = Number(lastActivityValue);
        const lockBelongsToCurrentUser = lockUserId === response.user.id;
        const shouldStayLocked = lockBelongsToCurrentUser && (
          window.sessionStorage.getItem(ADMIN_LOCKED_KEY) === 'true'
          || (lastActivityValue !== null
            && (!Number.isFinite(lastActivityAt) || now - lastActivityAt >= ADMIN_IDLE_TIMEOUT_MS))
        );
        if (shouldStayLocked) {
          window.sessionStorage.setItem(ADMIN_LOCKED_KEY, 'true');
        } else {
          window.sessionStorage.removeItem(ADMIN_LOCKED_KEY);
          window.sessionStorage.setItem(ADMIN_LOCK_USER_KEY, response.user.id);
          window.sessionStorage.setItem(ADMIN_LAST_ACTIVITY_KEY, String(now));
          setIsLocked(false);
        }
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

  useEffect(() => {
    if (!adminProfile || isLocked) return;

    let lastActivityAt = Number(window.sessionStorage.getItem(ADMIN_LAST_ACTIVITY_KEY)) || Date.now();
    let timeoutId: number;
    const lockPanel = () => {
      window.sessionStorage.setItem(ADMIN_LOCKED_KEY, 'true');
      setIsLocked(true);
    };
    const resetIdleTimeout = () => {
      lastActivityAt = Date.now();
      window.sessionStorage.setItem(ADMIN_LOCK_USER_KEY, adminProfile.id);
      window.sessionStorage.setItem(ADMIN_LAST_ACTIVITY_KEY, String(lastActivityAt));
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(lockPanel, ADMIN_IDLE_TIMEOUT_MS);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastActivityAt >= ADMIN_IDLE_TIMEOUT_MS) {
        window.clearTimeout(timeoutId);
        lockPanel();
        return;
      }
      resetIdleTimeout();
    };
    const activityEvents = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart', 'wheel'] as const;

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimeout, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    resetIdleTimeout();

    return () => {
      window.clearTimeout(timeoutId);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimeout);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [adminProfile, isLocked]);

  const signOut = useCallback(async () => {
    await api.logout();
    clearAuthSession();
    window.sessionStorage.removeItem(ADMIN_LOCKED_KEY);
    window.sessionStorage.removeItem(ADMIN_LAST_ACTIVITY_KEY);
    window.sessionStorage.removeItem(ADMIN_LOCK_USER_KEY);
    router.replace('/login');
  }, [router]);

  const unlockAdminPanel = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adminProfile || !unlockPassword || isUnlocking) return;

    setUnlockError(null);
    setIsUnlocking(true);
    try {
      const response = await api.adminLogin({
        email: adminProfile.email,
        password: unlockPassword,
      }) as AdminLoginResponse;
      const user = response.user;
      if (!user
        || user.id !== adminProfile.id
        || user.role !== 'admin'
        || !user.name
        || !user.email
        || user.email.toLowerCase() !== adminProfile.email.toLowerCase()
        || !user.admin_role
        || !user.department
        || typeof response.access_token !== 'string'
        || !/^[a-f0-9]{64}$/i.test(response.access_token)
        || response.token_type !== 'Bearer'
        || typeof response.expires_in !== 'number'
        || !Number.isFinite(response.expires_in)
        || response.expires_in <= 0) {
        throw new Error('The sign-in service returned an invalid session. Please try again or contact the school office.');
      }

      setAuthSession(response.access_token, response.expires_in, 'admin');
      const refreshedProfile: AdminProfile = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'admin',
        admin_role: user.admin_role,
        department: user.department,
      };
      window.localStorage.setItem('rhema_user', JSON.stringify(refreshedProfile));
      window.sessionStorage.setItem(ADMIN_LOCK_USER_KEY, refreshedProfile.id);
      window.sessionStorage.setItem(ADMIN_LAST_ACTIVITY_KEY, String(Date.now()));
      window.sessionStorage.removeItem(ADMIN_LOCKED_KEY);
      setAdminProfile(refreshedProfile);
      setUnlockPassword('');
      setIsLocked(false);
    } catch (error) {
      setUnlockPassword('');
      setUnlockError(error instanceof Error ? error.message : 'Unable to verify your password. Please try again.');
    } finally {
      setIsUnlocking(false);
    }
  }, [adminProfile, isUnlocking, unlockPassword]);

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
    <>
    <div inert={isLocked} aria-hidden={isLocked}>
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
    </div>
    {isLocked && (
      <div className="fixed inset-0 z-[10000] isolate flex min-h-screen items-center justify-center overflow-y-auto bg-slate-950 px-5 py-8">
        <Image
          src="/login-study.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="z-0 object-cover object-center"
        />
        <div aria-hidden="true" className="absolute inset-0 z-10 bg-gradient-to-br from-rhema-blue/95 via-blue-950/90 to-slate-950/95" />
        <div aria-hidden="true" className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(242,181,68,0.24),transparent_48%),radial-gradient(ellipse_at_bottom_right,rgba(200,16,46,0.2),transparent_48%)]" />
        <section
          aria-labelledby="admin-lock-title"
          aria-modal="true"
          className="relative z-20 my-auto w-full max-w-md rounded-3xl border border-white/70 bg-white p-7 shadow-2xl sm:p-9"
          role="dialog"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rhema-blue text-white">
            <LockKeyhole className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 id="admin-lock-title" className="mt-5 text-center text-2xl font-black tracking-tight text-slate-950">
            Admin panel locked
          </h1>
          <p className="mt-2 text-center text-sm leading-6 text-slate-600">
            This panel was locked after 15 minutes of inactivity. Enter your password to continue.
          </p>
          <p className="mt-4 text-center text-sm font-semibold text-slate-800">{adminProfile.email}</p>

          {unlockError && (
            <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{unlockError}</p>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={unlockAdminPanel}>
            <div>
              <label htmlFor="admin-unlock-password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Password
              </label>
              <input
                autoComplete="current-password"
                autoFocus
                className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-rhema-blue focus:bg-white focus:ring-2 focus:ring-rhema-blue/10"
                id="admin-unlock-password"
                name="password"
                onChange={(event) => setUnlockPassword(event.target.value)}
                required
                type="password"
                value={unlockPassword}
              />
            </div>
            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rhema-red px-4 py-3.5 text-sm font-bold text-white transition hover:bg-rhema-red-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rhema-red disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isUnlocking || !unlockPassword}
              type="submit"
            >
              {isUnlocking
                ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Verifying password...</>
                : 'Unlock admin panel'}
            </button>
          </form>
          <button
            className="mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            onClick={() => void signOut()}
            type="button"
          >
            Sign out
          </button>
        </section>
      </div>
    )}
    </>
  );
}