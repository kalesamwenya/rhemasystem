import type { ReactNode } from 'react';
import Link from 'next/link';

export default function CheckInOutLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f7f4] text-[#17201d] antialiased">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/admin/student-affairs" className="flex min-w-0 items-center gap-3" aria-label="Rhema Student Affairs">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-700 text-sm font-black tracking-tight text-white">R</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black tracking-wide text-slate-900">RHEMA BIBLE SCHOOL</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Student affairs · Attendance desk</span>
            </span>
          </Link>
          <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700 sm:inline-flex sm:items-center sm:gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Attendance system
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        {children}
      </main>
    </div>
  );
}
