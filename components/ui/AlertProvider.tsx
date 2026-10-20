'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, ShieldAlert, TriangleAlert, X } from 'lucide-react';
import type { AppConfirmRequest } from '@/components/ui/app-dialogs';

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
  const [confirmation, setConfirmation] = useState<AppConfirmRequest | null>(null);
  const confirmationQueue = useRef<AppConfirmRequest[]>([]);

  useEffect(() => {
    const originalAlert = window.alert;
    const timers = new Set<number>();
    const pendingConfirmations = confirmationQueue.current;
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
    const onConfirm = (event: Event) => {
      const request = (event as CustomEvent<AppConfirmRequest>).detail;
      confirmationQueue.current.push(request);
      if (confirmationQueue.current.length === 1) setConfirmation(request);
    };
    function dismiss(id: number) {
      setAlerts((current) => current.map((alert) => alert.id === id ? { ...alert, closing: true } : alert));
      const timer = window.setTimeout(() => {
        setAlerts((current) => current.filter((alert) => alert.id !== id));
        timers.delete(timer);
      }, 200);
      timers.add(timer);
    }
    const resolveConfirmation = (confirmed: boolean) => {
      const current = confirmationQueue.current.shift();
      current?.resolve(confirmed);
      setConfirmation(confirmationQueue.current[0] ?? null);
    };
    window.alert = interceptedAlert;
    window.addEventListener('rhema-app-alert', onAlert);
    window.addEventListener('rhema-app-alert-dismiss', onDismiss);
    window.addEventListener('rhema-app-confirm', onConfirm);
    window.addEventListener('keydown', onKeyDown);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && confirmationQueue.current.length) resolveConfirmation(false);
    }
    return () => {
      if (window.alert === interceptedAlert) window.alert = originalAlert;
      window.removeEventListener('rhema-app-alert', onAlert);
      window.removeEventListener('rhema-app-alert-dismiss', onDismiss);
      window.removeEventListener('rhema-app-confirm', onConfirm);
      window.removeEventListener('keydown', onKeyDown);
      pendingConfirmations.splice(0).forEach((request) => request.resolve(false));
      timers.forEach(window.clearTimeout);
    };
  }, []);

  return (
    <>
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(26rem,calc(100vw-2rem))] flex-col items-end gap-3 sm:bottom-5 sm:right-5">
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
      {confirmation && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return;
        confirmationQueue.current.shift()?.resolve(false);
        setConfirmation(confirmationQueue.current[0] ?? null);
      }}>
        <section role="alertdialog" aria-modal="true" aria-labelledby="app-confirm-title" aria-describedby="app-confirm-message" className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-2xl">
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${confirmation.options.tone === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'}`}>
            {confirmation.options.tone === 'danger' ? <ShieldAlert className="h-7 w-7" /> : <TriangleAlert className="h-7 w-7" />}
          </div>
          <h2 id="app-confirm-title" className="mt-4 text-lg font-black text-slate-900">{confirmation.options.title ?? 'Please confirm'}</h2>
          <p id="app-confirm-message" className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{confirmation.message}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" onClick={() => {
              confirmationQueue.current.shift()?.resolve(false);
              setConfirmation(confirmationQueue.current[0] ?? null);
            }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">{confirmation.options.cancelText ?? 'Cancel'}</button>
            <button type="button" autoFocus onClick={() => {
              confirmationQueue.current.shift()?.resolve(true);
              setConfirmation(confirmationQueue.current[0] ?? null);
            }} className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white transition ${confirmation.options.tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-900 hover:bg-slate-800'}`}>{confirmation.options.confirmText ?? 'Confirm'}</button>
          </div>
        </section>
      </div>}
    </>
  );
}
