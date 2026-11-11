'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Grid2X2, Heart, LibraryBig, List, Loader2, Search } from 'lucide-react';
import BookReader, { type BookData } from '@/components/library/BookReader';
import { api, assetUrl } from '@/lib/api';

type LibraryBook = BookData & {
  category: string;
  description: string;
  cover_path: string;
  has_pdf: boolean;
  progress_percent: number;
};

type ApiResponse<T> = { success: boolean; data?: T; message?: string };
type ViewMode = 'grid' | 'list';
const favouritesKey = 'rhema_book_library_favourites';

function isBookList(value: unknown): value is LibraryBook[] {
  return Array.isArray(value) && value.every((book) =>
    book && typeof book === 'object'
    && typeof book.id === 'number'
    && typeof book.title === 'string'
    && typeof book.category === 'string'
    && typeof book.progress_percent === 'number',
  );
}

export default function BookLibraryPage() {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All books');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [favourites, setFavourites] = useState<string[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [readerBook, setReaderBook] = useState<LibraryBook | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBooks = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.library.books() as ApiResponse<unknown>;
      if (!response.success || !isBookList(response.data)) throw new Error(response.message || 'The book catalogue response was invalid.');
      setBooks(response.data.map((book) => ({
        ...book,
        author: book.author || '',
        description: book.description || '',
        cover_path: book.cover_path || '',
        progress_percent: Number(book.progress_percent) || 0,
      })));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load the book catalogue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBooks();
      try {
        const stored = JSON.parse(window.localStorage.getItem(favouritesKey) || '[]') as unknown;
        if (Array.isArray(stored)) setFavourites(stored.filter((id): id is string => typeof id === 'string'));
      } catch {
        window.localStorage.removeItem(favouritesKey);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const categories = useMemo(() => ['All books', ...Array.from(new Set(books.map((book) => book.category).filter(Boolean))).sort()], [books]);
  const filteredBooks = useMemo(() => {
    const term = query.trim().toLowerCase();
    return books.filter((book) => {
      const matchesCategory = category === 'All books' || book.category === category;
      const matchesSaved = !savedOnly || favourites.includes(String(book.id));
      const searchable = `${book.title} ${book.author} ${book.category} ${book.description}`.toLowerCase();
      return matchesCategory && matchesSaved && (!term || searchable.includes(term));
    });
  }, [books, category, favourites, query, savedOnly]);
  const continueReading = books.filter((book) => book.progress_percent > 0 && book.progress_percent < 100)
    .sort((left, right) => right.progress_percent - left.progress_percent);

  const toggleFavourite = (bookId: number) => {
    const key = String(bookId);
    const next = favourites.includes(key) ? favourites.filter((id) => id !== key) : [...favourites, key];
    setFavourites(next);
    window.localStorage.setItem(favouritesKey, JSON.stringify(next));
  };

  const openReader = async (book: LibraryBook) => {
    setOpeningId(book.id);
    setError('');
    try {
      const response = await api.library.book(book.id) as ApiResponse<BookData>;
      if (!response.success || !response.data) throw new Error(response.message || 'This book could not be opened.');
      setReaderBook({
        ...book,
        ...response.data,
        id: book.id,
        author: response.data.author || '',
        description: response.data.description || '',
        progress_percent: book.progress_percent,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to open this book.');
    } finally {
      setOpeningId(null);
    }
  };

  const closeReader = () => {
    setReaderBook(null);
    void loadBooks();
  };

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#17201d]">
      <header className="border-b border-[#dce3de] bg-[#17201d] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-5 sm:px-8">
          <Link href="/student" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-[#17201d]"><LibraryBig className="h-5 w-5" /></div>
            <div><p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">Rhema</p><p className="text-lg font-black">Digital Library</p></div>
          </Link>
          <div className="hidden items-center gap-5 text-sm font-semibold text-slate-300 sm:flex"><a href="#catalogue" className="hover:text-white">Catalogue</a><button type="button" onClick={() => setSavedOnly((value) => !value)} className="hover:text-white">{savedOnly ? 'All books' : 'Saved books'}</button><Link href="/student" className="hover:text-white">Campus portal</Link></div>
          <button type="button" onClick={() => setSavedOnly((value) => !value)} className="rounded-lg border border-white/20 px-3 py-2 text-xs font-bold sm:hidden">{savedOnly ? 'All books' : 'Saved'}</button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
        <section className="grid gap-8 border-b border-[#dce3de] pb-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div><p className="text-xs font-black uppercase tracking-[0.22em] text-[#0f766e]">Read at your pace</p><h1 className="mt-3 max-w-2xl text-4xl font-black tracking-tight text-[#17201d] sm:text-5xl">A quieter place for serious reading.</h1><p className="mt-4 max-w-xl text-base leading-7 text-[#68746e]">Browse published books, continue where you left off, and keep your notes, highlights, and bookmarks with you.</p></div>
          <div className="rounded-2xl border border-[#dce3de] bg-white p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-amber-100 p-3 text-amber-700"><BookOpen className="h-5 w-5" /></div><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#68746e]">Your library</p><p className="mt-1 text-xl font-black">{favourites.length} saved · {continueReading.length} in progress</p></div></div><div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#68746e]"><span className="rounded-full bg-[#eef7f4] px-3 py-1.5 text-[#0f766e]">Progress saved</span><span className="rounded-full bg-slate-100 px-3 py-1.5">Notes and highlights</span></div></div>
        </section>

        {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

        {continueReading.length > 0 && (
          <section className="border-b border-[#dce3de] py-7">
            <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#68746e]">Pick up where you left off</p><h2 className="mt-1 text-xl font-black">Continue reading</h2></div><BookOpen className="h-5 w-5 text-[#0f766e]" /></div>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">{continueReading.slice(0, 6).map((book) => <button key={book.id} type="button" onClick={() => void openReader(book)} className="min-w-64 rounded-2xl border border-[#dce3de] bg-white p-4 text-left hover:border-[#0f766e]"><p className="text-sm font-black">{book.title}</p><p className="mt-1 text-xs text-[#68746e]">{book.progress_percent}% complete</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-700" style={{ width: `${book.progress_percent}%` }} /></div></button>)}</div>
          </section>
        )}

        <section id="catalogue" className="pt-8">
          <div className="flex flex-col gap-4 border-b border-[#dce3de] pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#68746e]">Catalogue</p><h2 className="mt-1 text-2xl font-black">Browse the collection</h2></div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex min-w-0 items-center gap-3 rounded-xl border border-[#dce3de] bg-white px-4 py-3 sm:w-80"><Search className="h-4 w-4 shrink-0 text-[#68746e]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, author or topic" className="w-full bg-transparent text-sm outline-none placeholder:text-[#9aa59f]" /></label>
              <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-[#dce3de] bg-white px-3 py-3 text-sm font-semibold">{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              <div className="flex rounded-xl border border-[#dce3de] bg-white p-1"><button type="button" onClick={() => setViewMode('grid')} aria-label="Grid view" className={`rounded-lg p-2 ${viewMode === 'grid' ? 'bg-[#17201d] text-white' : 'text-[#68746e]'}`}><Grid2X2 className="h-4 w-4" /></button><button type="button" onClick={() => setViewMode('list')} aria-label="List view" className={`rounded-lg p-2 ${viewMode === 'list' ? 'bg-[#17201d] text-white' : 'text-[#68746e]'}`}><List className="h-4 w-4" /></button></div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between text-xs font-semibold text-[#68746e]"><span>{loading ? 'Loading books…' : `${filteredBooks.length} title${filteredBooks.length === 1 ? '' : 's'} found`}</span><button type="button" onClick={() => setSavedOnly((value) => !value)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${savedOnly ? 'bg-rose-100 text-rose-700' : 'bg-white text-[#68746e]'}`}><Heart className={`h-3.5 w-3.5 ${savedOnly ? 'fill-current' : ''}`} /> {savedOnly ? 'Showing saved' : 'Saved only'}</button></div>
          {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-teal-700" /></div>
            : filteredBooks.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-[#b8c5bd] bg-white p-12 text-center"><BookOpen className="mx-auto h-8 w-8 text-[#9aa59f]" /><p className="mt-3 font-bold">No books match that search</p><button type="button" onClick={() => { setQuery(''); setCategory('All books'); setSavedOnly(false); }} className="mt-3 text-sm font-bold text-[#0f766e]">Clear filters</button></div>
              : <div className={viewMode === 'grid' ? 'mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3' : 'mt-5 space-y-3'}>{filteredBooks.map((book) => <BookCard key={book.id} book={book} compact={viewMode === 'list'} favourite={favourites.includes(String(book.id))} opening={openingId === book.id} onFavourite={() => toggleFavourite(book.id)} onRead={() => void openReader(book)} />)}</div>}
        </section>
      </div>

      <BookReader key={readerBook?.id ?? 'closed'} book={readerBook ?? undefined} isOpen={Boolean(readerBook)} onClose={closeReader} />
    </main>
  );
}

function BookCard({ book, compact, favourite, opening, onFavourite, onRead }: { book: LibraryBook; compact: boolean; favourite: boolean; opening: boolean; onFavourite: () => void; onRead: () => void }) {
  return (
    <article className={`group overflow-hidden border border-[#dce3de] bg-white transition hover:border-[#0f766e] hover:shadow-lg hover:shadow-[#0f766e]/5 ${compact ? 'flex items-center gap-4 rounded-2xl p-4' : 'rounded-2xl'}`}>
      <div className={`flex shrink-0 items-center justify-center overflow-hidden bg-[#17201d] text-amber-400 ${compact ? 'h-20 w-14 rounded-lg' : 'h-48 w-full'}`}>
        {book.cover_path ? <Image src={assetUrl(book.cover_path)} alt="" width={360} height={192} unoptimized className="h-full w-full object-cover" /> : <BookOpen className={compact ? 'h-5 w-5' : 'h-9 w-9'} />}
      </div>
      <div className={compact ? 'min-w-0 flex-1' : 'p-5'}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><span className="text-[10px] font-black uppercase tracking-wider text-[#0f766e]">{book.category || 'General'}</span><h3 className="mt-1 line-clamp-2 font-black leading-snug text-[#17201d]">{book.title}</h3><p className="mt-1 truncate text-xs text-[#68746e]">{book.author || 'Author not listed'}</p></div>
          <button type="button" onClick={onFavourite} aria-label={favourite ? `Remove ${book.title} from saved books` : `Save ${book.title}`} className="shrink-0 rounded-lg p-1.5 text-[#68746e] hover:bg-rose-50 hover:text-rose-600"><Heart className={`h-4 w-4 ${favourite ? 'fill-rose-500 text-rose-500' : ''}`} /></button>
        </div>
        {!compact && <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#68746e]">{book.description || 'Open this book to begin reading.'}</p>}
        {book.progress_percent > 0 && <div className="mt-3"><div className="mb-1 flex justify-between text-[10px] font-semibold text-slate-500"><span>Reading progress</span><span>{book.progress_percent}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-700" style={{ width: `${book.progress_percent}%` }} /></div></div>}
        <button type="button" onClick={onRead} disabled={opening} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f766e] px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-[#115e59] disabled:opacity-60">{opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}{book.progress_percent ? 'Continue reading' : 'Read book'}</button>
      </div>
    </article>
  );
}
