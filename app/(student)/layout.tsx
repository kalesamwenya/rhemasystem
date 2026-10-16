// src/app/(dashboard)/student/layout.tsx
'use client';

import StudentSidebar from '@/components/students/student-sidebar';
import StudentTopbar from '@/components/students/student-topbar';
import { StudentAudioProvider } from '@/components/students/StudentAudioPlayer';
import { CommunicationProvider } from '@/components/communications/CommunicationProvider';
import FloatingChatBubble from '@/components/communications/FloatingChatBubble';
import LoadingPlaceholder from '@/components/ui/LoadingPlaceholder';
import { clearAuthSession } from '@/lib/api';
import React, { useEffect, useState } from 'react';

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [student, setStudent] = useState({ name: '', studentId: '', email: '' });
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let authorizationTimer: number | undefined;
    try {
      const user = JSON.parse(window.localStorage.getItem('rhema_user') || 'null');
      if (user?.role !== 'student') {
        clearAuthSession();
        const next = `${window.location.pathname}${window.location.search}`;
        window.location.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      authorizationTimer = window.setTimeout(() => {
        setStudent({
          name: typeof user.name === 'string' ? user.name : 'Student',
          studentId: String(user.student_id || user.id || ''),
          email: typeof user.email === 'string' ? user.email : '',
        });
        setAuthorized(true);
      }, 0);
    } catch {
      clearAuthSession();
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.replace(`/login?next=${encodeURIComponent(next)}`);
    }
    return () => {
      if (authorizationTimer !== undefined) window.clearTimeout(authorizationTimer);
    };
  }, []);

  if (!authorized) return <LoadingPlaceholder variant="student" />;

  return (
    <CommunicationProvider>
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans antialiased">
      
      {/* Background Dimming Overlay for Mobile Viewports */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Structural Desktop/Mobile Sidebar Navigation */}
      <StudentSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Workspace Area Pane */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <StudentTopbar 
          student={student} 
          onMenuToggle={() => setIsSidebarOpen(prev => !prev)} 
          isSidebarOpen={isSidebarOpen}
        />
        
        {/* Scrollable Content Viewport Container */}
        <StudentAudioProvider>
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="mx-auto max-w-8xl">
              {children}
            </div>
          </main>
        </StudentAudioProvider>
      </div>
    </div>
    <FloatingChatBubble />
    </CommunicationProvider>
  );
}