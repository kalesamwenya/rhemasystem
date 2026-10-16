'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Calendar, ShieldCheck, CreditCard, Info, AlertTriangle, X, MailOpen } from 'lucide-react';
import { api } from '@/lib/api';

interface AlertItem {
  id: number;
  title: string;
  detail: string;
  time: string;
  type: 'critical' | 'billing' | 'academic' | 'general';
  date: string;
  authority: string;
}

export default function AlertsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading alerts...</div>}>
      <StudentNotificationsPage />
    </Suspense>
  );
}

function StudentNotificationsPage() {
  const router = useRouter();

  // Core System Operational Event Records
  const [notifications, setNotifications] = useState<AlertItem[]>([
    {
      id: 1001,
      title: "Immediate Action Required: Double Verification Token Lock",
      detail: "The central registration system database will begin schema migration routines this coming Friday at 16:00 CAT. Ensure your multi-factor credentials match current registry states to avoid session locks over the integration window.",
      time: "10 mins ago",
      date: "May 23, 2026",
      type: "critical",
      authority: "System Security Node"
    },
    {
      id: 1002,
      title: "Invoice Cleared: Semester Examination Fees Applied",
      detail: "Your payment reference tracking voucher for K4,250 has been reconciled successfully with our mobile money gateway cluster. Your digital statement balance and exam seating card token clearances are updated.",
      time: "2 hrs ago",
      date: "May 23, 2026",
      type: "billing",
      authority: "Accounts Receivable Office"
    },
    {
      id: 1003,
      title: "Continuous Assessment Milestone Posted",
      detail: "Dr. Mwansa committed the final evaluation matrix metrics for the Advanced Web Architecture portfolio. Review raw indexing parameters inside the grades dashboard interface.",
      time: "1 day ago",
      date: "May 22, 2026",
      type: "academic",
      authority: "School of Computing"
    },
    {
      id: 1004,
      title: "Guild Elections Polling Key Generation",
      detail: "Student Union tracking codes are undergoing generation checks. Check your institutional digital cryptographic keys on the portal dashboard sidebar node before polling windows initiate.",
      time: "3 days ago",
      date: "May 20, 2026",
      type: "general",
      authority: "Electoral Commission Panel"
    }
  ]);

  const [filter, setFilter] = useState<string>('all');
  const [activeModalItem, setActiveModalItem] = useState<AlertItem | null>(null);

  useEffect(() => {
    api.alerts.list()
      .then((body: { data?: Array<{ id: number; course: string; name: string; time?: string; date?: string }> }) => setNotifications((body.data || []).map((alert) => ({
        id: Number(alert.id),
        title: `${alert.course} payment alert`,
        detail: `${alert.name} has a payment alert for ${alert.course}.`,
        time: String(alert.time || ''),
        type: 'billing',
        date: String(alert.date || ''),
        authority: 'Accounts Receivable Office',
      }))))
      .catch(() => undefined);
  }, []);

  const closeModal = () => {
    setActiveModalItem(null);
    // Purge the URL tracking key parameter context smoothly
    router.push('/student/notifications');
  };

  const filteredAlerts = notifications.filter(item => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'critical': return { bg: 'bg-red-50 text-red-700 border-red-200', icon: AlertTriangle };
      case 'billing': return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CreditCard };
      case 'academic': return { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: ShieldCheck };
      default: return { bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: Info };
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-8xl mx-auto space-y-6">
        
        {/* Hub Architecture Identity Header Layout */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-blue-900 uppercase">
              <Bell className="h-3.5 w-3.5 text-amber-500" /> Administrative Operations Center
            </div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-1">System Log Registry</h1>
          </div>

          {/* Filtering Category Segment Controls Row */}
          <div className="flex flex-wrap gap-1 bg-slate-200/60 p-1 rounded-xl border border-slate-200">
            {['all', 'critical', 'billing', 'academic', 'general'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  filter === cat
                    ? 'bg-slate-950 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </header>

        {/* Primary Stack List Feed */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
          {filteredAlerts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium text-xs">
              No matching structural logs found inside this category filter scope.
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const { bg, icon: IconComponent } = getTypeStyles(alert.type);
              
              return (
                <div
                  key={alert.id}
                  onClick={() => setActiveModalItem(alert)}
                  className="p-5 hover:bg-slate-50/70 transition-all flex items-start gap-4 cursor-pointer group"
                >
                  <div className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 ${bg}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h2 className="text-xs font-black text-slate-900 group-hover:text-blue-900 transition-colors uppercase tracking-wide truncate">
                        {alert.title}
                      </h2>
                      <span className="text-[9px] text-slate-400 font-mono tracking-tight sm:shrink-0">
                        {alert.time}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {alert.detail}
                    </p>
                    <div className="flex items-center gap-4 mt-2.5 text-[9px] text-slate-400 font-mono uppercase tracking-wider">
                      <span>Node: <strong>{alert.authority}</strong></span>
                      <span>•</span>
                      <span>Stamp: {alert.date}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Interactive Operational Log Reading Modal Interceptor */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          
          <div 
            onClick={closeModal} 
            className="absolute inset-0" 
          />

          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Modal Heading Header Area Panel */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
              <div className="space-y-1.5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${getTypeStyles(activeModalItem.type).bg}`}>
                  System Log Event: {activeModalItem.type}
                </span>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide leading-snug">
                  {activeModalItem.title}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-900 transition-colors shrink-0 border border-transparent hover:border-slate-200"
                aria-label="Close systemic report reading block overlay panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Text Content Block Body Area */}
            <div className="p-6 text-xs text-slate-600 space-y-4 leading-relaxed font-medium">
              <p className="text-slate-800 bg-slate-50/40 border border-slate-100 rounded-2xl p-4 italic font-medium">
                &quot;{activeModalItem.detail}&quot;
              </p>

              <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4 text-[10px] font-mono uppercase tracking-wide">
                <div className="space-y-0.5">
                  <span className="text-slate-400 block text-[9px]">Issuing Operations Group</span>
                  <span className="text-slate-900 font-bold flex items-center gap-1">
                    <MailOpen className="h-3 w-3 text-slate-500" /> {activeModalItem.authority}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-400 block text-[9px]">Registry Processing Timestamp</span>
                  <span className="text-slate-900 font-bold flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-500" /> {activeModalItem.date} ({activeModalItem.time})
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Processing Clear Dismiss Action Block Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider transition-all"
              >
                Acknowledge and Terminate View
              </button>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}