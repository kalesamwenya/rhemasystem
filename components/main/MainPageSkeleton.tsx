type MainPageSkeletonVariant = 'editorial' | 'directory' | 'curriculum';

function Block({ className }: { className: string }) {
  return <div aria-hidden="true" className={`rhema-skeleton rounded-xl bg-slate-200 ${className}`} />;
}

function HeroSkeleton() {
  return (
    <section className="bg-[#f4f5f4] px-4 pb-14 pt-32 sm:px-6 sm:pb-16 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <Block className="h-3 w-24 rounded-full" />
        <Block className="h-12 w-full max-w-3xl sm:h-16" />
        <Block className="h-4 w-full max-w-2xl" />
        <Block className="h-4 w-4/5 max-w-xl" />
      </div>
    </section>
  );
}

function CourseListSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-7xl space-y-6 px-4 py-14 sm:px-6 lg:px-8">
      {[0, 1].map((year) => (
        <section key={year} className="rounded-3xl bg-slate-50 p-6 sm:p-8">
          <Block className="h-3 w-28 rounded-full" />
          <Block className="mt-3 h-9 w-64 max-w-full" />
          <Block className="mt-3 h-4 w-full max-w-xl" />
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 12 }, (_, index) => (
              <Block key={index} className="h-12 bg-white" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function CourseGridSkeleton() {
  return (
    <section role="status" aria-label="Loading public curriculum" aria-busy="true">
      <span className="sr-only">Loading public curriculum</span>
      <CourseListSkeleton />
    </section>
  );
}

export default function MainPageSkeleton({
  variant = 'editorial',
  label = 'Loading page content',
}: {
  variant?: MainPageSkeletonVariant;
  label?: string;
}) {
  return (
    <div role="status" aria-label={label} aria-busy="true" className="min-h-[70vh] bg-white">
      <span className="sr-only">{label}</span>
      <HeroSkeleton />
      {variant === 'curriculum' ? (
        <>
          <section aria-hidden="true" className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
            <div className="space-y-4">
              <Block className="h-3 w-32 rounded-full" />
              <Block className="h-10 w-full max-w-md" />
              <Block className="h-4 w-full" />
              <Block className="h-4 w-5/6" />
              <Block className="h-20 w-full" />
            </div>
            <Block className="h-64 rounded-3xl" />
          </section>
          <CourseListSkeleton />
        </>
      ) : variant === 'directory' ? (
        <section aria-hidden="true" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl space-y-4 text-center">
            <Block className="mx-auto h-12 w-12 rounded-2xl" />
            <Block className="mx-auto h-8 w-72 max-w-full" />
            <Block className="mx-auto h-4 w-full max-w-xl" />
          </div>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }, (_, index) => (
              <div key={index} className="space-y-4">
                <Block className="mx-auto aspect-square w-full max-w-48 rounded-full" />
                <Block className="mx-auto h-4 w-3/4" />
                <Block className="mx-auto h-3 w-1/2" />
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div aria-hidden="true" className="mx-auto max-w-7xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-2">
            <Block className="h-56 rounded-3xl" />
            <div className="space-y-4 rounded-3xl border border-slate-100 p-6">
              <Block className="h-8 w-3/4" />
              <Block className="h-4 w-full" />
              <Block className="h-4 w-5/6" />
              <Block className="h-24 w-full" />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="space-y-4 rounded-2xl border border-slate-100 p-6">
                <Block className="h-6 w-2/3" />
                <Block className="h-4 w-full" />
                <Block className="h-4 w-5/6" />
                <Block className="h-4 w-4/6" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
