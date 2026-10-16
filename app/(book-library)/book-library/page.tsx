"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Bookmark,
  Clock3,
  Filter,
  Grid2X2,
  Heart,
  LibraryBig,
  List,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import BookReader, { type BookData } from "@/components/library/BookReader";

type LibraryBook = BookData & {
  category: string;
  description: string;
  pages: number;
  format: string;
  rating: number;
  tags: string[];
  featured?: boolean;
};

type ViewMode = "grid" | "list";

const BOOKS: LibraryBook[] = [
  {
    id: "book-foundations-leadership",
    title: "Foundations of Christian Leadership",
    author: "Rhema Academic Press",
    category: "Leadership",
    description: "A practical guide to servant leadership, spiritual formation and responsible ministry in modern communities.",
    pages: 184,
    format: "PDF / EPUB",
    rating: 4.8,
    tags: ["Ministry", "Leadership", "Formation"],
    featured: true,
  },
  {
    id: "book-intentional-study",
    title: "The Art of Intentional Study",
    author: "M. Chileshe",
    category: "Study skills",
    description: "Build a sustainable reading practice with clear goals, reflection and focused attention.",
    pages: 126,
    format: "PDF",
    rating: 4.6,
    tags: ["Study", "Learning", "Practice"],
    featured: true,
  },
  {
    id: "book-community-faith",
    title: "Community, Faith and Service",
    author: "Rhema Research Collective",
    category: "Community",
    description: "Case studies exploring how learning becomes meaningful through service and community life.",
    pages: 212,
    format: "PDF / EPUB",
    rating: 4.7,
    tags: ["Community", "Faith", "Service"],
  },
  {
    id: "book-pastoral-care",
    title: "A Field Guide to Pastoral Care",
    author: "Dr. Ruth Banda",
    category: "Pastoral studies",
    description: "Grounded approaches to listening, care, boundaries and practical support for ministry teams.",
    pages: 240,
    format: "PDF",
    rating: 4.9,
    tags: ["Pastoral", "Care", "Counselling"],
  },
  {
    id: "book-reading-scripture",
    title: "Reading Scripture with Context",
    author: "J. M. Phiri",
    category: "Biblical studies",
    description: "An accessible introduction to context, genre and responsible interpretation for emerging scholars.",
    pages: 198,
    format: "PDF / EPUB",
    rating: 4.5,
    tags: ["Bible", "Context", "Interpretation"],
  },
  {
    id: "book-digital-ministry",
    title: "Digital Ministry in Practice",
    author: "Lydia Mwansa",
    category: "Technology",
    description: "A clear framework for using digital tools to extend teaching, community and responsible outreach.",
    pages: 156,
    format: "PDF",
    rating: 4.4,
    tags: ["Digital", "Media", "Outreach"],
  },
];

const categories = ["All books", ...Array.from(new Set(BOOKS.map((book) => book.category)))];
const favouritesKey = "rhema_book_library_favourites";
const historyKey = "rhema_book_library_history";

function downloadBook(book: LibraryBook) {
  const content = `${book.title}\n${book.author}\n\n${book.description}\n\nRhema Digital Library copy`;
  const objectUrl = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `${book.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export default function BookLibraryPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All books");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null);
  const [readerBook, setReaderBook] = useState<LibraryBook | null>(null);
  const [favourites, setFavourites] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(window.localStorage.getItem(favouritesKey) || "[]") as string[];
  });
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return JSON.parse(window.localStorage.getItem(historyKey) || "[]") as string[];
  });
  const [showFilters, setShowFilters] = useState(false);

  const filteredBooks = useMemo(() => {
    const term = query.trim().toLowerCase();
    return BOOKS.filter((book) => {
      const matchesCategory = category === "All books" || book.category === category;
      const matchesQuery = !term || `${book.title} ${book.author} ${book.category} ${book.tags.join(" ")}`.toLowerCase().includes(term);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const toggleFavourite = (bookId: string) => {
    const next = favourites.includes(bookId) ? favourites.filter((id) => id !== bookId) : [...favourites, bookId];
    setFavourites(next);
    window.localStorage.setItem(favouritesKey, JSON.stringify(next));
  };

  const openReader = (book: LibraryBook) => {
    const nextHistory = [book.id, ...history.filter((id) => id !== book.id)].slice(0, 5);
    setHistory(nextHistory);
    window.localStorage.setItem(historyKey, JSON.stringify(nextHistory));
    setSelectedBook(null);
    setReaderBook(book);
  };

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#17201d]">
      <header className="border-b border-[#dce3de] bg-[#17201d] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-5 sm:px-8">
          <Link href="/student" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-[#17201d]"><LibraryBig className="h-5 w-5" /></div>
            <div><p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">Rhema</p><p className="text-lg font-black">Digital Library</p></div>
          </Link>
          <div className="hidden items-center gap-5 text-sm font-semibold text-slate-300 sm:flex"><Link href="#catalogue" className="hover:text-white">Catalogue</Link><Link href="#favourites" className="hover:text-white">Favourites</Link><Link href="/student" className="hover:text-white">Campus portal</Link></div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-12">
        <section className="grid gap-8 border-b border-[#dce3de] pb-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div><p className="text-xs font-black uppercase tracking-[0.22em] text-[#0f766e]">Read at your pace</p><h1 className="mt-3 max-w-2xl text-4xl font-black tracking-tight text-[#17201d] sm:text-5xl">A quieter place for serious reading.</h1><p className="mt-4 max-w-xl text-base leading-7 text-[#68746e]">Find course companions, pastoral resources and thoughtful introductions. Your notes, highlights and reading progress stay with you.</p></div>
          <div className="rounded-2xl border border-[#dce3de] bg-white p-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-amber-100 p-3 text-amber-700"><Sparkles className="h-5 w-5" /></div><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#68746e]">Your library</p><p className="mt-1 text-xl font-black">{favourites.length} saved · {history.length} recent</p></div></div><div className="mt-4 flex gap-2 text-xs font-semibold text-[#68746e]"><span className="rounded-full bg-[#eef7f4] px-3 py-1.5 text-[#0f766e]">Offline-friendly</span><span className="rounded-full bg-slate-100 px-3 py-1.5">Annotations saved</span></div></div>
        </section>

        <section id="catalogue" className="pt-8">
          <div className="flex flex-col gap-4 border-b border-[#dce3de] pb-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#68746e]">Catalogue</p><h2 className="mt-1 text-2xl font-black">Browse the collection</h2></div><div className="flex flex-col gap-3 sm:flex-row"><div className="flex min-w-0 items-center gap-3 rounded-xl border border-[#dce3de] bg-white px-4 py-3 sm:w-80"><Search className="h-4 w-4 shrink-0 text-[#68746e]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, author or topic" className="w-full bg-transparent text-sm outline-none placeholder:text-[#9aa59f]" /></div><button onClick={() => setShowFilters(!showFilters)} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${showFilters ? "border-[#0f766e] bg-[#eef7f4] text-[#0f766e]" : "border-[#dce3de] bg-white text-[#17201d]"}`}><Filter className="h-4 w-4" /> Filters</button><div className="flex rounded-xl border border-[#dce3de] bg-white p-1"><button onClick={() => setViewMode("grid")} aria-label="Grid view" className={`rounded-lg p-2 ${viewMode === "grid" ? "bg-[#17201d] text-white" : "text-[#68746e]"}`}><Grid2X2 className="h-4 w-4" /></button><button onClick={() => setViewMode("list")} aria-label="List view" className={`rounded-lg p-2 ${viewMode === "list" ? "bg-[#17201d] text-white" : "text-[#68746e]"}`}><List className="h-4 w-4" /></button></div></div></div>
          {showFilters ? <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[#dce3de] bg-white p-4"><span className="mr-2 text-xs font-black uppercase tracking-wider text-[#68746e]">Category</span>{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-3 py-2 text-xs font-bold ${category === item ? "bg-[#0f766e] text-white" : "bg-slate-100 text-[#68746e] hover:bg-slate-200"}`}>{item}</button>)}</div> : null}
          <div className="mt-6 flex items-center justify-between text-xs font-semibold text-[#68746e]"><span>{filteredBooks.length} title{filteredBooks.length === 1 ? "" : "s"} found</span><span>{category === "All books" ? "All categories" : category}</span></div>
          {filteredBooks.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-[#b8c5bd] bg-white p-12 text-center"><BookOpen className="mx-auto h-8 w-8 text-[#9aa59f]" /><p className="mt-3 font-bold">No books match that search</p><button onClick={() => { setQuery(""); setCategory("All books"); }} className="mt-3 text-sm font-bold text-[#0f766e]">Clear filters</button></div> : <div className={viewMode === "grid" ? "mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3" : "mt-5 space-y-3"}>{filteredBooks.map((book) => <BookCard key={book.id} book={book} compact={viewMode === "list"} favourite={favourites.includes(book.id)} onFavourite={() => toggleFavourite(book.id)} onDetails={() => setSelectedBook(book)} onRead={() => openReader(book)} onDownload={() => downloadBook(book)} />)}</div>}
        </section>

        {history.length > 0 ? <section className="border-t border-[#dce3de] pt-8"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#68746e]">Continue reading</p><h2 className="mt-1 text-xl font-black">Pick up where you left off</h2></div><Clock3 className="h-5 w-5 text-[#0f766e]" /></div><div className="mt-4 flex gap-3 overflow-x-auto pb-2">{history.map((id) => { const book = BOOKS.find((item) => item.id === id); return book ? <button key={id} onClick={() => openReader(book)} className="min-w-64 rounded-2xl border border-[#dce3de] bg-white p-4 text-left hover:border-[#0f766e]"><p className="text-sm font-black">{book.title}</p><p className="mt-1 text-xs text-[#68746e]">{book.author}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#0f766e]">Continue <ArrowRight className="h-3 w-3" /></span></button> : null; })}</div></section> : null}
      </div>

      {selectedBook ? <BookDetails book={selectedBook} favourite={favourites.includes(selectedBook.id)} onClose={() => setSelectedBook(null)} onFavourite={() => toggleFavourite(selectedBook.id)} onRead={() => openReader(selectedBook)} onDownload={() => downloadBook(selectedBook)} /> : null}
      <BookReader book={readerBook ?? undefined} isOpen={Boolean(readerBook)} onClose={() => setReaderBook(null)} userId="portal-student" />
    </main>
  );
}

function BookCard({ book, compact, favourite, onFavourite, onDetails, onRead, onDownload }: { book: LibraryBook; compact: boolean; favourite: boolean; onFavourite: () => void; onDetails: () => void; onRead: () => void; onDownload: () => void }) {
  return <article className={`group border border-[#dce3de] bg-white transition hover:border-[#0f766e] hover:shadow-lg hover:shadow-[#0f766e]/5 ${compact ? "flex items-center gap-5 rounded-2xl p-4" : "rounded-2xl p-5"}`}><div className={`flex shrink-0 items-center justify-center rounded-xl bg-[#17201d] text-amber-400 ${compact ? "h-16 w-12" : "h-40 w-full"}`}><BookOpen className={compact ? "h-5 w-5" : "h-9 w-9"} /></div><div className={compact ? "min-w-0 flex-1" : "mt-5"}><div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-black uppercase tracking-wider text-[#0f766e]">{book.category}</span><h3 className="mt-1 font-black leading-snug text-[#17201d]">{book.title}</h3><p className="mt-1 text-xs text-[#68746e]">{book.author}</p></div><button onClick={onFavourite} aria-label={favourite ? `Remove ${book.title} from saved books` : `Save ${book.title}`} className="rounded-lg p-1.5 text-[#68746e] hover:bg-amber-50 hover:text-amber-600"><Heart className={`h-4 w-4 ${favourite ? "fill-amber-500 text-amber-500" : ""}`} /></button></div>{!compact ? <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#68746e]">{book.description}</p> : null}<div className="mt-4 flex items-center gap-3 text-[11px] text-[#68746e]"><span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {book.rating}</span><span>{book.pages} pages</span><span>{book.format}</span></div>{!compact ? <div className="mt-5 grid grid-cols-2 gap-2"><button onClick={onDetails} className="rounded-xl border border-[#dce3de] px-3 py-2 text-xs font-bold text-[#17201d] hover:bg-slate-50">Details</button><button onClick={onRead} className="rounded-xl bg-[#17201d] px-3 py-2 text-xs font-bold text-white hover:bg-[#0f766e]">Read now</button></div> : <div className="flex gap-2"><button onClick={onRead} className="rounded-xl bg-[#17201d] px-3 py-2 text-xs font-bold text-white">Read</button><button onClick={onDetails} className="rounded-xl border border-[#dce3de] px-3 py-2 text-xs font-bold">Details</button><button onClick={onDownload} aria-label={`Download ${book.title}`} className="rounded-xl border border-[#dce3de] p-2 text-[#68746e]"><ArrowDownToLine className="h-4 w-4" /></button></div>}</div></article>;
}

function BookDetails({ book, favourite, onClose, onFavourite, onRead, onDownload }: { book: LibraryBook; favourite: boolean; onClose: () => void; onFavourite: () => void; onRead: () => void; onDownload: () => void }) {
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#17201d]/60 p-4" onClick={onClose}><div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between bg-[#17201d] p-6 text-white sm:p-8"><div><span className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">{book.category}</span><h2 className="mt-3 text-3xl font-black">{book.title}</h2><p className="mt-2 text-sm text-slate-300">{book.author}</p></div><button onClick={onClose} aria-label="Close book details" className="rounded-full bg-white/10 p-2 hover:bg-white/20"><X className="h-5 w-5" /></button></div><div className="p-6 sm:p-8"><p className="text-base leading-7 text-[#68746e]">{book.description}</p><div className="mt-6 grid grid-cols-3 gap-3"><div className="rounded-xl bg-[#f7f8f5] p-4"><p className="text-xs text-[#68746e]">Length</p><p className="mt-1 font-black">{book.pages} pages</p></div><div className="rounded-xl bg-[#f7f8f5] p-4"><p className="text-xs text-[#68746e]">Format</p><p className="mt-1 font-black">{book.format}</p></div><div className="rounded-xl bg-[#f7f8f5] p-4"><p className="text-xs text-[#68746e]">Rating</p><p className="mt-1 inline-flex items-center gap-1 font-black"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {book.rating}</p></div></div><div className="mt-6 flex flex-wrap gap-2">{book.tags.map((tag) => <span key={tag} className="rounded-full bg-[#eef7f4] px-3 py-1.5 text-xs font-bold text-[#0f766e]">{tag}</span>)}</div><div className="mt-8 flex flex-col gap-3 sm:flex-row"><button onClick={onRead} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#17201d] px-4 py-3 text-sm font-black text-white"><BookOpen className="h-4 w-4" /> Start reading</button><button onClick={onDownload} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dce3de] px-4 py-3 text-sm font-bold"><ArrowDownToLine className="h-4 w-4" /> Download</button><button onClick={onFavourite} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#dce3de] px-4 py-3 text-sm font-bold"><Bookmark className={`h-4 w-4 ${favourite ? "fill-amber-500 text-amber-500" : ""}`} /> {favourite ? "Saved" : "Save"}</button></div></div></div></div>;
}
