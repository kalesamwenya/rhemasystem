'use client';

import { useEffect } from 'react';
import { api } from '@/lib/api';

function requestId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export default function AdminErrorMonitor() {
  useEffect(() => {
    let reportsInWindow = 0;
    let windowStartedAt = Date.now();

    const report = (type: 'javascript' | 'unhandled-rejection', value: unknown, source = '') => {
      const now = Date.now();
      if (now - windowStartedAt >= 60000) {
        reportsInWindow = 0;
        windowStartedAt = now;
      }
      if (reportsInWindow >= 10) return;
      reportsInWindow++;

      const error = value instanceof Error ? value : null;
      const message = error?.message || String(value || 'Unknown browser error');
      void api.errorLogs.report({
        type,
        message: message.slice(0, 2000),
        source: source.slice(0, 500),
        route: window.location.pathname,
        stack: (error?.stack || '').slice(0, 8000),
        request_id: requestId(),
      }).catch((reportError: unknown) => {
        console.warn('Browser error report could not be saved.', reportError);
      });
    };

    const handleError = (event: ErrorEvent) => {
      report('javascript', event.error || event.message, event.filename || '');
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      report('unhandled-rejection', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}
