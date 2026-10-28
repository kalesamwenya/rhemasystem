'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, Camera, Eye, RefreshCw, RotateCcw, Users, ZoomIn, ZoomOut } from 'lucide-react';
import { ComposableMap, Geographies, Geography, Graticule, Marker, ZoomableGroup } from 'react-simple-maps';
import { api } from '@/lib/api';

type Period = 7 | 30 | 365;

type VisitorLocation = {
  city_name: string | null;
  region_name: string | null;
  country_code: string | null;
  country_name: string | null;
  latitude: number | string;
  longitude: number | string;
  visitors: number | string;
  page_views: number | string;
};

type AnalyticsDashboard = {
  success: boolean;
  days: Period;
  summary: {
    unique_visitors: number;
    page_views: number;
    actions: number;
  };
  trend: Array<{ day: string; visitors: number; page_views: number }>;
  top_pages: Array<{ page_path: string; page_views: number; visitors: number }>;
  locations: VisitorLocation[];
  location_database_loaded: boolean;
  recent: Array<{
    event_type: 'page_view' | 'action';
    page_path: string;
    action_type: 'navigation' | 'button' | null;
    created_at: string;
  }>;
};

const numberFormat = new Intl.NumberFormat();

function formatDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDateTime(value: string) {
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function getLocationName(location: VisitorLocation) {
  return [location.city_name, location.region_name, location.country_name]
    .filter(Boolean)
    .join(', ') || location.country_code || 'Unknown location';
}

export default function WebsiteStatistics() {
  const [days, setDays] = useState<Period>(30);
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [mapZoom, setMapZoom] = useState(1);
  const [screenshotError, setScreenshotError] = useState('');
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const response = await api.websiteAnalytics.dashboard(days) as AnalyticsDashboard;
      if (!response.success || !response.summary || !Array.isArray(response.trend)
        || !Array.isArray(response.top_pages) || !Array.isArray(response.locations)
        || !Array.isArray(response.recent)) {
        throw new Error('The website analytics response was incomplete.');
      }
      setDashboard(response);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load website analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh, refreshKey]);

  const maxVisitors = Math.max(1, ...(dashboard?.trend || []).map((item) => item.visitors));
  const maxLocationVisitors = Math.max(1, ...(dashboard?.locations || []).map((item) => Number(item.visitors)));
  const mappedLocations = (dashboard?.locations || []).filter((location) => {
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    return Number.isFinite(latitude) && Number.isFinite(longitude)
      && latitude >= -90 && latitude <= 90
      && longitude >= -180 && longitude <= 180;
  });
  const summaryCards = [
    { label: 'Unique visitors', value: dashboard?.summary.unique_visitors ?? 0, icon: Users, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Page views', value: dashboard?.summary.page_views ?? 0, icon: Eye, tone: 'bg-violet-50 text-violet-700' },
    { label: 'Website actions', value: dashboard?.summary.actions ?? 0, icon: Activity, tone: 'bg-emerald-50 text-emerald-700' },
  ];

  const downloadMapScreenshot = async () => {
    setScreenshotError('');
    let svgUrl = '';
    try {
      const sourceSvg = mapContainerRef.current?.querySelector('svg');
      if (!sourceSvg) throw new Error('The visitor map is not ready to capture.');

      const bounds = sourceSvg.getBoundingClientRect();
      const pixelRatio = 2;
      const width = Math.max(1, Math.round(bounds.width * pixelRatio));
      const height = Math.max(1, Math.round(bounds.height * pixelRatio));
      const screenshotSvg = sourceSvg.cloneNode(true) as SVGSVGElement;
      screenshotSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      screenshotSvg.setAttribute('width', String(width));
      screenshotSvg.setAttribute('height', String(height));

      const svgBlob = new Blob([new XMLSerializer().serializeToString(screenshotSvg)], {
        type: 'image/svg+xml;charset=utf-8',
      });
      svgUrl = URL.createObjectURL(svgBlob);
      const image = new Image();
      image.src = svgUrl;
      await image.decode();

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not prepare the map screenshot.');
      context.fillStyle = '#eff6ff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      const screenshot = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Your browser could not create the map screenshot.'));
        }, 'image/png');
      });
      const downloadUrl = URL.createObjectURL(screenshot);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `website-visitor-map-${days}-days.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (cause) {
      setScreenshotError(cause instanceof Error ? cause.message : 'Unable to capture the visitor map.');
    } finally {
      if (svgUrl) URL.revokeObjectURL(svgUrl);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Public website</div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Website statistics</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Anonymous visitor counts, popular pages, and broad navigation/button activity. Form contents and visitor IDs are not shown.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="analytics-period" className="sr-only">Date range</label>
          <select
            id="analytics-period"
            value={days}
            onChange={(event) => setDays(Number(event.target.value) as Period)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={365}>Last year</option>
          </select>
          <button
            type="button"
            onClick={() => setRefreshKey((current) => current + 1)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">{error}</div>
          <button type="button" onClick={() => setRefreshKey((current) => current + 1)} className="shrink-0 font-bold underline">Retry</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {summaryCards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${tone}`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </span>
            <div className="mt-3 text-2xl font-black text-slate-900">{numberFormat.format(value)}</div>
          </div>
        ))}
      </div>

      {loading && !dashboard ? (
        <p role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading website statistics…</p>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Daily visitors</h2>
              <p className="mt-1 text-xs text-slate-500">Distinct anonymous browser IDs that viewed a public page each day.</p>
            </div>
            {!dashboard?.trend.length ? (
              <p className="py-12 text-center text-sm text-slate-500">No visitor activity for this period yet.</p>
            ) : (
              <div className="mt-6 flex h-52 items-end gap-1 overflow-x-auto pb-7">
                {dashboard.trend.map((item) => (
                  <div key={item.day} className="group relative flex h-full min-w-3 flex-1 flex-col justify-end">
                    <div
                      className="w-full rounded-t-md bg-blue-600 transition-colors group-hover:bg-blue-700"
                      style={{ height: `${Math.max(2, (item.visitors / maxVisitors) * 100)}%` }}
                      title={`${formatDate(item.day)}: ${numberFormat.format(item.visitors)} visitors`}
                    />
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-slate-400">
                      {dashboard.trend.length <= 14 || item.day.endsWith('-01') ? formatDate(item.day) : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Most visited pages</h2>
              {!dashboard?.top_pages.length ? (
                <p className="py-10 text-center text-sm text-slate-500">No page views recorded for this period.</p>
              ) : (
                <div className="mt-4 divide-y divide-slate-100">
                  {dashboard.top_pages.map((page) => (
                    <div key={page.page_path} className="flex items-center justify-between gap-4 py-3">
                      <span className="min-w-0 truncate font-mono text-sm text-slate-700">{page.page_path}</span>
                      <span className="shrink-0 text-right text-xs text-slate-500">
                        <strong className="text-slate-900">{numberFormat.format(Number(page.page_views))}</strong> views
                        <span className="mx-1.5 text-slate-300">·</span>
                        {numberFormat.format(Number(page.visitors))} visitors
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-[#003da5]">Visitor locations</h2>
                  <p className="mt-1 text-xs text-slate-500">Approximate IP-based locations. Points indicate city or region, not a visitor’s exact address.</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMapZoom((zoom) => Math.min(8, Number((zoom * 1.4).toFixed(2))))}
                    disabled={mapZoom >= 8}
                    aria-label="Zoom in on visitor map"
                    title="Zoom in"
                    className="rounded-lg border border-[#003da5]/20 bg-white p-2 text-[#003da5] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapZoom((zoom) => Math.max(1, Number((zoom / 1.4).toFixed(2))))}
                    disabled={mapZoom <= 1}
                    aria-label="Zoom out on visitor map"
                    title="Zoom out"
                    className="rounded-lg border border-[#003da5]/20 bg-white p-2 text-[#003da5] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapZoom(1)}
                    disabled={mapZoom === 1}
                    aria-label="Reset visitor map zoom"
                    title="Reset zoom"
                    className="rounded-lg border border-[#003da5]/20 bg-white p-2 text-[#003da5] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void downloadMapScreenshot()}
                    aria-label="Download visitor map screenshot"
                    title="Save map screenshot"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#c8102e] px-3 py-2 text-xs font-bold text-white hover:bg-[#a90d27]"
                  >
                    <Camera className="h-4 w-4" />
                    <span className="hidden sm:inline">Screenshot</span>
                  </button>
                </div>
              </div>
              <div ref={mapContainerRef} className="mt-4 overflow-hidden rounded-xl border border-blue-200 bg-blue-50">
                <ComposableMap
                  role="img"
                  aria-label="World map showing approximate visitor locations"
                  projection="geoEqualEarth"
                  projectionConfig={{ scale: 150 }}
                  className="block h-auto w-full"
                >
                  <ZoomableGroup zoom={mapZoom} minZoom={1} maxZoom={8}>
                    <Graticule stroke="#003da5" strokeOpacity={0.22} strokeWidth={0.35} />
                    <Geographies geography="/world.json">
                      {({ geographies }) => geographies.map((geography) => (
                        <Geography
                          key={geography.rsmKey}
                          geography={geography}
                          fill="#003da5"
                          stroke="#c8102e"
                          strokeWidth={0.45}
                          fillOpacity={0.16}
                        />
                      ))}
                    </Geographies>
                    {mappedLocations.map((location, index) => {
                      const latitude = Number(location.latitude);
                      const longitude = Number(location.longitude);
                      const visitors = Number(location.visitors);
                      const title = getLocationName(location);
                      return (
                        <Marker
                          key={`${location.country_code}-${location.city_name}-${location.region_name}-${index}`}
                          coordinates={[longitude, latitude]}
                        >
                          <circle
                            r={Math.min(11, 3.5 + Math.sqrt(visitors / maxLocationVisitors) * 6)}
                            fill="#c8102e"
                            fillOpacity={0.9}
                            stroke="white"
                            strokeWidth={1.5}
                          >
                            <title>{`${title}: ${numberFormat.format(visitors)} visitors`}</title>
                          </circle>
                        </Marker>
                      );
                    })}
                  </ZoomableGroup>
                </ComposableMap>
              </div>
              {screenshotError && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{screenshotError}</p>}
              {!mappedLocations.length && (
                <p className="mt-3 text-xs text-slate-500">
                  {dashboard?.location_database_loaded
                    ? 'No mapped visitor locations are available for this period.'
                    : 'The world map is available offline. Visitor markers appear when server-side IP geolocation is configured.'}
                </p>
              )}
              {mappedLocations.length > 0 && (
                <div className="mt-3 max-h-48 divide-y divide-slate-100 overflow-y-auto">
                  {mappedLocations.slice(0, 10).map((location, index) => (
                    <div key={`${location.country_code}-${location.city_name}-${index}`} className="flex items-center justify-between gap-3 py-2 text-xs">
                      <span className="min-w-0 truncate text-slate-700">{getLocationName(location)}</span>
                      <span className="shrink-0 font-bold text-slate-900">{numberFormat.format(Number(location.visitors))} visitors</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Recent website activity</h2>
              {!dashboard?.recent.length ? (
                <p className="py-10 text-center text-sm text-slate-500">No website activity recorded for this period.</p>
              ) : (
                <div className="mt-4 max-h-[28rem] divide-y divide-slate-100 overflow-y-auto">
                  {dashboard.recent.map((item, index) => (
                    <div key={`${item.created_at}-${index}`} className="flex items-start justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800">
                          {item.event_type === 'page_view' ? 'Page viewed' : `${item.action_type === 'navigation' ? 'Navigation' : 'Button'} selected`}
                        </div>
                        <div className="mt-1 truncate font-mono text-xs text-slate-500">{item.page_path}</div>
                      </div>
                      <time className="shrink-0 text-right text-[10px] text-slate-400">{formatDateTime(item.created_at)}</time>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <p className="text-xs leading-5 text-slate-500">
            Visitor counts use a random first-party browser ID and are estimates, not verified individual identities. Approximate city/region is looked up locally from the request IP; raw IP addresses are discarded and never stored. Analytics data is retained for up to one year.
          </p>
        </>
      )}
    </div>
  );
}
