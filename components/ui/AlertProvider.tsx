'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X, TriangleAlert } from 'lucide-react';

type AlertKind = 'success' | 'error' | 'warning' | 'info';

interface AppAlert {
  id: number;
  message: string;
  kind: AlertKind;
  closing: boolean;
}

function getAlertKind(message: string): AlertKind {
  if (/\b(success|successfully|saved|created|updated|published|synced|sent)\b/i.test(message)) return 'success';
  if (/\b(warning|caution|attention)\b/i.test(message)) return 'warning';
  if (/\b(error|unable|failed|failure|invalid|cannot|could not)\b/i.test(message)) return 'error';
  return 'info';
}

const alertStyles: Record<AlertKind, { icon: typeof Info; panel: string; iconColor: string; label: string }> = {
  success: { icon: CheckCircle2, panel: 'border-emerald-200 bg-white text-emerald-950', iconColor: 'text-emerald-600', label: 'Success' },
  error: { icon: AlertCircle, panel: 'border-rose-200 bg-white text-rose-950', iconColor: 'text-rose-600', label: 'Error' },
  warning: { icon: TriangleAlert, panel: 'border-amber-200 bg-white text-amber-950', iconColor: 'text-amber-600', label: 'Notice' },
  info: { icon: Info, panel: 'border-indigo-200 bg-white text-slate-900', iconColor: 'text-indigo-600', label: 'Information' },
};

export default function AlertProvider() {
  const [alerts, setAlerts] = useState<AppAlert[]>([]);

  useEffect(() => {
    const originalAlert = window.alert;
    const timers = new Set<number>();
    const interceptedAlert = (message?: string) => {
      window.dispatchEvent(new CustomEvent('rhema-app-alert', { detail: String(message ?? '') }));
    };
    const onAlert = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      const id = Date.now() + Math.random();
      setAlerts((current) => [...current.slice(-3), {
        id,
        message: message || 'An update is available.',
        kind: getAlertKind(message || ''),
        closing: false,
      }]);
      const timer = window.setTimeout(() => dismiss(id), 6500);
      timers.add(timer);
    };
    const onDismiss = (event: Event) => {
      const id = (event as CustomEvent<number>).detail;
      dismiss(id);
    };
    function dismiss(id: number) {
      setAlerts((current) => current.map((alert) => alert.id === id ? { ...alert, closing: true } : alert));
      const timer = window.setTimeout(() => {
        setAlerts((current) => current.filter((alert) => alert.id !== id));
        timers.delete(timer);
      }, 200);
      timers.add(timer);
    }
    window.alert = interceptedAlert;
    window.addEventListener('rhema-app-alert', onAlert);
    window.addEventListener('rhema-app-alert-dismiss', onDismiss);
    return () => {
      if (window.alert === interceptedAlert) window.alert = originalAlert;
      window.removeEventListener('rhema-app-alert', onAlert);
      window.removeEventListener('rhema-app-alert-dismiss', onDismiss);
      timers.forEach(window.clearTimeout);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-3 px-4 sm:inset-x-auto sm:right-5 sm:top-5 sm:w-[min(26rem,calc(100vw-2rem))] sm:items-end">
      {alerts.map((alert) => {
        const style = alertStyles[alert.kind];
        const Icon = style.icon;
        return (
          <div
            key={alert.id}
            role={alert.kind === 'error' ? 'alert' : 'status'}
            aria-live={alert.kind === 'error' ? 'assertive' : 'polite'}
            className={`rhema-toast pointer-events-auto flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-xl shadow-slate-950/10 ${style.panel} ${alert.closing ? 'rhema-toast-exit' : ''}`}
          >
            <Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${style.iconColor}`} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] opacity-70">{style.label}</p>
              <p className="mt-0.5 break-words text-sm font-medium leading-5">{alert.message}</p>
            </div>
            <button
              type="button"
              aria-label="Dismiss alert"
              onClick={() => window.dispatchEvent(new CustomEvent('rhema-app-alert-dismiss', { detail: alert.id }))}
              className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
