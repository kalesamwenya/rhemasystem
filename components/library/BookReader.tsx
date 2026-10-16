'use client';

import { BookOpen, X } from 'lucide-react';

export type BookData = {
  id: string;
  title: string;
  author: string;
  content?: string;
  description?: string;
};

type BookReaderProps = {
  book?: BookData;
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
};

export default function BookReader({ book, isOpen, onClose }: BookReaderProps) {
  if (!isOpen || !book) return null;

  const text = book.content?.trim() || book.description?.trim() || '';
  const paragraphs = text.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#f7f4eb] text-slate-900">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-xl bg-amber-100 p-2.5 text-amber-800"><BookOpen className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-black sm:text-base">{book.title}</h1>
            <p className="truncate text-xs text-slate-500">{book.author}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close reader" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <X className="h-5 w-5" />
        </button>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-5 py-10 sm:px-10">
        <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-12 sm:py-12">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Rhema Digital Library</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight">{book.title}</h2>
          <p className="mt-2 text-sm text-slate-500">{book.author}</p>
          <div className="mt-8 space-y-5 text-base leading-8 text-slate-700">
            {paragraphs.length
              ? paragraphs.map((paragraph, index) => <p key={index} className="whitespace-pre-wrap">{paragraph}</p>)
              : <p className="italic text-slate-500">No reading content is available for this title yet.</p>}
          </div>
        </article>
      </main>
    </div>
  );
}
