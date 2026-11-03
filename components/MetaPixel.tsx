'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Consent = 'accepted' | 'rejected' | null;
type PixelArgument = string | number;
type MetaPixelFunction = {
  (...args: PixelArgument[]): void;
  callMethod?: (...args: PixelArgument[]) => void;
  queue: PixelArgument[][];
  push?: MetaPixelFunction;
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: MetaPixelFunction;
    _fbq?: MetaPixelFunction;
    rhemaMetaPixelId?: string;
  }
}

const CONSENT_KEY = 'rhema_meta_pixel_consent';
const pixelId = (process.env.NEXT_PUBLIC_META_PIXEL_ID || '').trim();
const pixelIdIsValid = /^\d{5,20}$/.test(pixelId);
const privatePath = /^\/(admin|student|lecturer|login|forgot-password|reset-password|verify|recommendation|checkin|slips|apply|application|register|checkout|payment|cart|purchases)(?:\/|$)/i;

function trackPageView(id: string) {
  if (!window.fbq) {
    const fbq: MetaPixelFunction = (...args) => {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    };
    fbq.queue = [];
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    window.fbq = fbq;
    window._fbq = fbq;
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }
  if (window.rhemaMetaPixelId !== id) {
    window.fbq('init', id);
    window.rhemaMetaPixelId = id;
  }
  window.fbq('track', 'PageView');
}

export default function MetaPixel() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent>(null);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedConsent = window.localStorage.getItem(CONSENT_KEY);
        if (savedConsent === 'accepted' || savedConsent === 'rejected') setConsent(savedConsent);
      } catch {
        setConsent('rejected');
      }
      setPreferencesLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!pixelIdIsValid || consent !== 'accepted' || privatePath.test(pathname)) return;
    trackPageView(pixelId);
  }, [consent, pathname]);

  const chooseConsent = (choice: Exclude<Consent, null>) => {
    try {
      window.localStorage.setItem(CONSENT_KEY, choice);
    } catch {
      // The preference still applies for this page session when storage is unavailable.
    }
    setConsent(choice);
  };

  const reopenPreferences = () => {
    try {
      window.localStorage.removeItem(CONSENT_KEY);
    } catch {
      // The preference dialog can still be reopened for this page session.
    }
    setConsent(null);
  };

  if (!pixelId || privatePath.test(pathname)) return null;
  const showPrompt = preferencesLoaded && consent === null;
  return (
    <>
      {showPrompt ? (
        <aside aria-label="Cookie preferences" className="fixed inset-x-3 bottom-3 z-[150] mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-700">
            With your permission, Meta Pixel measures visits to public pages to help us understand and improve our Facebook and Instagram advertising. It is not loaded on sign-in or private portal pages. Read our <Link className="font-bold text-blue-800 underline" href="/privacy">privacy policy</Link>.
          </p>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => chooseConsent('rejected')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700">Reject</button>
            <button type="button" onClick={() => chooseConsent('accepted')} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Accept analytics</button>
          </div>
        </aside>
      ) : (
        <button type="button" onClick={reopenPreferences} className="fixed bottom-2 right-2 z-[140] rounded-full border border-slate-300 bg-white/95 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 shadow-sm hover:text-slate-950">
          Cookie settings
        </button>
      )}
    </>
  );
}
