import MainPageSkeleton from '@/components/main/MainPageSkeleton';

type LoadingVariant = 'website' | 'student' | 'lecturer' | 'admin';

const variants: Record<LoadingVariant, { label: string; background: string; accent: string }> = {
  website: { label: 'Loading page', background: 'bg-slate-50', accent: 'bg-indigo-100' },
  student: { label: 'Loading student portal', background: 'bg-slate-50', accent: 'bg-indigo-100' },
  lecturer: { label: 'Loading lecturer portal', background: 'bg-slate-50', accent: 'bg-emerald-100' },
  admin: { label: 'Loading admin workspace', background: 'bg-[#f6f7f4]', accent: 'bg-teal-100' },
};

function SkeletonBlock({ className, accent }: { className: string; accent: string }) {
  return <div aria-hidden="true" className={`rhema-skeleton rounded-xl ${accent} ${className}`} />;
}

export default function LoadingPlaceholder({ variant }: { variant: LoadingVariant }) {
  const portal = variant !== 'website';
  if (variant === 'website') {
    return <MainPageSkeleton label="Loading homepage" />;
  }

  const config = variants[variant];

  return (
    <div
      role="status"
      aria-label={config.label}
      aria-busy="true"
      className={`min-h-screen ${config.background}`}
    >
      <span className="sr-only">{config.label}</span>
      {portal ? (
        <div className="flex min-h-screen">
          <aside className="hidden w-64 shrink-0 border-r border-slate-200/70 bg-white p-6 md:block">
            <SkeletonBlock accent={config.accent} className="mb-10 h-10 w-36" />
            <div className="space-y-3">
              {Array.from({ length: 7 }, (_, index) => <SkeletonBlock key={index} accent={config.accent} className={`h-10 ${index === 1 ? 'w-full' : 'w-11/12'}`} />)}
            </div>
          </aside>
          <main className="min-w-0 flex-1">
            <header className="flex h-16 items-center justify-between border-b border-slate-200/70 bg-white px-5 md:px-8">
              <SkeletonBlock accent={config.accent} className="h-8 w-36" />
              <SkeletonBlock accent={config.accent} className="h-9 w-9 rounded-full" />
            </header>
            <div className="mx-auto max-w-7xl space-y-7 p-5 md:p-8">
              <div className="space-y-3">
                <SkeletonBlock accent={config.accent} className="h-8 w-64 max-w-full" />
                <SkeletonBlock accent={config.accent} className="h-4 w-96 max-w-full" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => <SkeletonBlock key={index} accent={config.accent} className="h-28" />)}
              </div>
              <SkeletonBlock accent={config.accent} className="h-64 w-full" />
              <div className="grid gap-4 md:grid-cols-2">
                <SkeletonBlock accent={config.accent} className="h-36" />
                <SkeletonBlock accent={config.accent} className="h-36" />
              </div>
            </div>
          </main>
        </div>
      ) : (
        <>
          <header className="flex h-20 items-center justify-between border-b border-slate-200/70 bg-white px-5 md:px-12">
            <SkeletonBlock accent={config.accent} className="h-10 w-40" />
            <div className="hidden gap-5 md:flex">
              {Array.from({ length: 5 }, (_, index) => <SkeletonBlock key={index} accent={config.accent} className="h-4 w-16" />)}
            </div>
            <SkeletonBlock accent={config.accent} className="h-9 w-24" />
          </header>
          <main className="mx-auto max-w-7xl space-y-8 px-5 py-12 md:px-10 md:py-16">
            <SkeletonBlock accent={config.accent} className="h-[min(32rem,55vh)] w-full rounded-3xl" />
            <div className="mx-auto max-w-3xl space-y-4 text-center">
              <SkeletonBlock accent={config.accent} className="mx-auto h-8 w-2/3" />
              <SkeletonBlock accent={config.accent} className="mx-auto h-4 w-full" />
              <SkeletonBlock accent={config.accent} className="mx-auto h-4 w-4/5" />
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => <SkeletonBlock key={index} accent={config.accent} className="h-40" />)}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
