'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { recordClientActivity } from '@/lib/api';
import { getActivityVisitorId } from '@/lib/activity-identity';

const EXCLUDED_PATH_PATTERN = /^\/(admin|login|lecturer|student|check-in-out|checkin|slips|forgot-password|reset-password|verify|verify-payment|verify-profile|recommendation|cart|purchases)(?:\/|$)|\/(?:apply|application|register|checkout|payment)(?:\/|$)/i;
let websiteAnalyticsWarningShown = false;

function getVisitorTechnology() {
  const userAgent = navigator.userAgent;
  const platformHint = 'userAgentData' in navigator
    ? (navigator as Navigator & { userAgentData?: { platform?: string; mobile?: boolean; brands?: Array<{ brand: string }> } }).userAgentData
    : undefined;
  const platformValue = navigator.platform || platformHint?.platform || '';
  const normalizedPlatform = platformValue.toLowerCase();
  const normalizedAgent = userAgent.toLowerCase();
  const isIPadOS = normalizedPlatform === 'macintel' && navigator.maxTouchPoints > 1;

  const deviceType = platformHint?.mobile
    ? 'mobile'
    : isIPadOS
      || /ipad|tablet|kindle|silk|playbook/i.test(userAgent)
      || (normalizedAgent.includes('android') && !normalizedAgent.includes('mobile'))
      ? 'tablet'
      : /mobile|iphone|ipod|android/i.test(userAgent)
        ? 'mobile'
        : 'desktop';

  const operatingSystem = isIPadOS
    ? 'iOS'
    : /windows/.test(normalizedAgent) || /win/.test(normalizedPlatform)
    ? 'Windows'
    : /iphone|ipad|ipod/.test(normalizedAgent)
      ? 'iOS'
      : /android/.test(normalizedAgent) || normalizedPlatform.includes('android')
        ? 'Android'
        : /cros/.test(normalizedAgent) || /chrome\s?os/.test(normalizedPlatform)
          ? 'Chrome OS'
          : /mac os|macintosh/.test(normalizedAgent) || /mac/.test(normalizedPlatform)
            ? 'macOS'
            : /linux/.test(normalizedAgent) || /linux/.test(normalizedPlatform)
              ? 'Linux'
              : 'Other';

  const browserBrand = platformHint?.brands?.find((item) => !/not.?a.?brand/i.test(item.brand))?.brand || '';
  const browserName = /edge/i.test(browserBrand) || /edg(e|a|ios)?\//i.test(userAgent) ? 'Edge'
    : /opera/i.test(browserBrand) || /opr\//i.test(userAgent) || /opios/i.test(userAgent) ? 'Opera'
      : /firefox/i.test(browserBrand) || /firefox\//i.test(userAgent) || /fxios/i.test(userAgent) ? 'Firefox'
        : /chrome|chromium/i.test(browserBrand) || /chrome|crios\//i.test(userAgent) ? 'Chrome'
          : /safari/i.test(browserBrand) || /safari\//i.test(userAgent) ? 'Safari'
            : /msie|trident/i.test(userAgent) ? 'Internet Explorer'
              : 'Other';
  const platform = isIPadOS || /iphone|ipad|ipod/i.test(platformValue) ? 'Apple mobile'
    : /win/i.test(platformValue) ? 'Windows'
    : /mac/i.test(platformValue) ? 'Mac'
      : /cros|chrome\s?os/i.test(platformValue) ? 'Chrome OS'
      : /android/i.test(platformValue) ? 'Android'
        : /linux/i.test(platformValue) ? 'Linux'
          : 'Other';

  return { device_type: deviceType, operating_system: operatingSystem, browser_name: browserName, platform };
}

function isTrackablePath(path: string) {
  let normalizedPath = path;
  try {
    normalizedPath = decodeURIComponent(path);
  } catch {
    return false;
  }
  return normalizedPath.startsWith('/')
    && normalizedPath.length <= 255
    && !/[?#\u0000-\u001f\u007f]/.test(normalizedPath)
    && !EXCLUDED_PATH_PATTERN.test(normalizedPath);
}

function sendWebsiteAnalytics(eventType: 'page_view' | 'action', pagePath: string, actionType?: 'navigation' | 'button') {
  if (!isTrackablePath(pagePath)) return;
  const visitorId = getActivityVisitorId();
  if (!visitorId) return;

  void fetch('/api/site-analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visitor_id: visitorId,
      event_type: eventType,
      page_path: pagePath,
      action_type: actionType ?? null,
      ...getVisitorTechnology(),
    }),
    cache: 'no-store',
    keepalive: true,
  }).then((response) => {
    if (!response.ok && !websiteAnalyticsWarningShown) {
      websiteAnalyticsWarningShown = true;
      console.warn(`Website analytics could not be recorded (HTTP ${response.status}).`);
    }
  }).catch((error) => {
    if (websiteAnalyticsWarningShown) return;
    websiteAnalyticsWarningShown = true;
    console.warn('Website analytics could not reach the server.', error);
  });
}

export default function ActivityTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);
  const lastAnalyticsPath = useRef<string | null>(null);

  useEffect(() => {
    if (lastTrackedPath.current === pathname) return;
    lastTrackedPath.current = pathname;
    recordClientActivity('Page viewed', 'GET', pathname);
  }, [pathname]);

  useEffect(() => {
    if (lastAnalyticsPath.current === pathname) return;
    lastAnalyticsPath.current = pathname;
    sendWebsiteAnalytics('page_view', pathname);
  }, [pathname]);

  useEffect(() => {
    const recordWebsiteInteraction = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest('a,button,[role="button"]');
      if (!control
        || control.closest('form')
        || control.hasAttribute('disabled')
        || control.getAttribute('aria-disabled') === 'true') return;

      let activityPath = window.location.pathname;
      let actionType: 'navigation' | 'button' = 'button';
      if (control instanceof HTMLAnchorElement) {
        actionType = 'navigation';
        try {
          const destination = new URL(control.href, window.location.href);
          if (destination.origin === window.location.origin) activityPath = destination.pathname;
        } catch {
          activityPath = window.location.pathname;
        }
      }
      sendWebsiteAnalytics('action', activityPath, actionType);
    };

    document.addEventListener('click', recordWebsiteInteraction, true);
    return () => document.removeEventListener('click', recordWebsiteInteraction, true);
  }, []);

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
