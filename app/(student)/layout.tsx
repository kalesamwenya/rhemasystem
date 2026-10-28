// src/app/(dashboard)/student/layout.tsx
'use client';

import StudentSidebar from '@/components/students/student-sidebar';
import StudentTopbar from '@/components/students/student-topbar';
import { StudentAudioProvider } from '@/components/students/StudentAudioPlayer';
import { CommunicationProvider } from '@/components/communications/CommunicationProvider';
import FloatingChatBubble from '@/components/communications/FloatingChatBubble';
import LoadingPlaceholder from '@/components/ui/LoadingPlaceholder';
import { api, clearAuthSession } from '@/lib/api';
import React, { useEffect, useState } from 'react';

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [student, setStudent] = useState({ name: '', studentId: '', email: '' });
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    let active = true;
    api.studentSession()
      .then((response: { user?: { id?: string; student_id?: string; name?: string; email?: string; role?: string } }) => {
        const user = response.user;
        if (!user?.id || user.role !== 'student') {
          throw new Error('The student session is invalid.');
        }
        if (!active) return;
        setStudent({
          name: typeof user.name === 'string' ? user.name : 'Student',
          studentId: String(user.student_id || user.id),
          email: typeof user.email === 'string' ? user.email : '',
        });
        window.localStorage.setItem('rhema_user', JSON.stringify(user));
        setAuthorized(true);
      })
      .catch((error: Error & { status?: number }) => {
        if (!active) return;
        if (error.status === 401) {
          clearAuthSession();
          const next = `${window.location.pathname}${window.location.search}`;
          window.location.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }
        setAuthError(error.message || 'Unable to verify the student session.');
      });
    return () => {
      active = false;
    };
  }, []);

  if (!authorized) {
    if (authError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
          <p role="alert" className="max-w-lg text-sm font-semibold text-red-700">{authError}</p>
          <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Retry session check
          </button>
        </div>
      );
    }
    return <LoadingPlaceholder variant="student" />;
  }

  return (
    <CommunicationProvider>
    <div className="flex h-screen w-full overflow-hidden bg-[#f6f8fc] font-sans text-slate-900 antialiased">
      
      <StudentSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <StudentTopbar 
          student={student} 
          onMenuToggle={() => setIsSidebarOpen(prev => !prev)} 
          isSidebarOpen={isSidebarOpen}
        />
        
        <StudentAudioProvider>
          <main className="flex-1 scroll-smooth overflow-y-auto p-3 sm:p-5 lg:p-7">
            <div className="mx-auto max-w-[1440px]">
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