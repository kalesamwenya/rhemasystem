'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { recordClientActivity } from '@/lib/api';

export default function ActivityTracker() {
  const pathname = usePathname();

  useEffect(() => {
    recordClientActivity('Page viewed', 'GET', pathname);
  }, [pathname]);

  useEffect(() => {
    const recordInteraction = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest('a,button,[role="button"]');
      if (!control || control.hasAttribute('disabled') || control.getAttribute('aria-disabled') === 'true') return;

      let activityPath = window.location.pathname;
      let summary = 'Interface control activated';
      if (control instanceof HTMLAnchorElement) {
        try {
          const destination = new URL(control.href, window.location.href);
          if (destination.origin === window.location.origin) {
            activityPath = destination.pathname;
            summary = 'Navigation link selected';
          } else {
            summary = 'External link selected';
          }
        } catch {
          summary = 'Navigation link selected';
        }
      }
      recordClientActivity(summary, 'POST', activityPath);
    };

    const recordFormSubmission = (event: SubmitEvent) => {
      const form = event.target;
      if (form instanceof HTMLFormElement) {
        recordClientActivity('Form submitted', 'POST', window.location.pathname);
      }
    };

    document.addEventListener('click', recordInteraction, true);
    document.addEventListener('submit', recordFormSubmission, true);
    return () => {
      document.removeEventListener('click', recordInteraction, true);
      document.removeEventListener('submit', recordFormSubmission, true);
    };
  }, []);

  return null;
}
