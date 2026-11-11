'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, BookOpen, FileText, ImagePlus, Loader2, Pencil, Plus, Search, Trash2, UploadCloud, X } from 'lucide-react';
import { confirmWithApp } from '@/components/ui/app-dialogs';
import { api, assetUrl } from '@/lib/api';

type Book = {
  id: number;
  title: string;
  author: string;
  category: string;
  description: string;
  cover_path: string;
  file_path: string;
  has_pdf: boolean;
  has_text: boolean;
  status: 'Draft' | 'Published';
  updated_at: string;
};

type BookDraft = {
  id?: number;
  title: string;
  author: string;
  category: string;
  description: string;
  coverPath: string;
  filePath: string;
  content: string;
  status: 'Draft' | 'Published';
  pdf: File | null;
  cover: File | null;
};

type BookDetails = {
  id: number;
  title: string;
  author: string;
  category: string;
  description: string | null;
  cover_path: string;
  file_path: string;
  content: string | null;
  status: Book['status'];
};

const emptyDraft = (): BookDraft => ({
  title: '',
  author: '',
  category: '',
  description: '',
  coverPath: '',
  filePath: '',
  content: '',
  status: 'Draft',
  pdf: null,
  cover: null,
});

export default function AdminBookLibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | Book['status']>('All');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<BookDraft | null>(null);
  const [notice, setNotice] = useState('');

  const loadBooks = async () => {
    setLoading(true);
    try {
      const response = await api.library.adminBooks() as { data?: Book[] };
      setBooks(response.data ?? []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to load books.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadBooks(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filteredBooks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return books.filter((book) =>
      (statusFilter === 'All' || book.status === statusFilter)
      && (!term || `${book.title} ${book.author} ${book.category}`.toLowerCase().includes(term)),
    );
  }, [books, search, statusFilter]);

  const openNewBook = () => {
    setNotice('');
    setDraft(emptyDraft());
  };

  const openEditBook = async (book: Book) => {
    setNotice('');
    setEditing(true);
    try {
      const response = await api.library.adminBook(book.id) as { data?: BookDetails };
      if (!response.data) throw new Error('The book details were not returned.');
      const details = response.data;
      setDraft({
        id: details.id,
        title: details.title,
        author: details.author,
        category: details.category,
        description: details.description ?? '',
        coverPath: details.cover_path ?? '',
        filePath: details.file_path ?? '',
        content: details.content ?? '',
        status: details.status,
        pdf: null,
        cover: null,
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to open this book.');
    } finally {
      setEditing(false);
    }
  };

  const saveBook = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;
    if (!draft.pdf && !draft.filePath && !draft.content.trim()) {
      setNotice('Add a PDF file or enter reading text before saving.');
      return;
    }
    setSaving(true);
    setNotice('');
    try {
      let filePath = draft.filePath;
      let coverPath = draft.coverPath;
      if (draft.pdf) {
        const upload = await api.library.uploadBookFile(draft.pdf, 'book') as { data?: { path?: string } };
        if (!upload.data?.path) throw new Error('The PDF upload did not return a file path.');
        filePath = upload.data.path;
      }
      if (draft.cover) {
        const upload = await api.library.uploadBookFile(draft.cover, 'cover') as { data?: { path?: string } };
        if (!upload.data?.path) throw new Error('The cover upload did not return a file path.');
        coverPath = upload.data.path;
      }
      await api.library.saveBook({
        ...(draft.id ? { id: draft.id } : {}),
        title: draft.title.trim(),
        author: draft.author.trim(),
        category: draft.category.trim(),
        description: draft.description.trim(),
        cover_path: coverPath,
        file_path: filePath,
        content: draft.content,
        status: draft.status,
      });
      setDraft(null);
      await loadBooks();
      setNotice('Book saved.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to save this book.');
    } finally {
      setSaving(false);
    }
  };

  const removeBook = async (book: Book) => {
    const confirmed = await confirmWithApp(
      `Remove “${book.title}” and its student reading notes from the catalogue?`,
      { title: 'Remove this book?', confirmText: 'Remove book', tone: 'danger' },
    );
    if (!confirmed) return;
    setNotice('');
    try {
      await api.library.removeBook(book.id);
      await loadBooks();
      setNotice('Book removed.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to remove this book.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/library" aria-label="Back to library resources" className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">Digital library</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">Book catalogue</h1>
          </div>
        </div>
        <button type="button" onClick={openNewBook} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-700">
          <Plus className="h-4 w-4" /> Add book
        </button>
      </div>

      {notice && <p role="status" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{notice}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, author or category" className="w-full bg-transparent text-sm outline-none" />
          </label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold">
            <option value="All">All statuses</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
          </select>
        </div>

        {loading ? <div className="flex justify-center py-14"><Loader2 className="h-6 w-6 animate-spin text-teal-700" /></div> : filteredBooks.length === 0 ? (
          <div className="py-14 text-center text-sm text-slate-500">No books found. Add a PDF or a text book to get started.</div>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {filteredBooks.map((book) => (
              <article key={book.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
                <div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                  {book.cover_path ? <Image src={assetUrl(book.cover_path)} alt="" width={80} height={96} unoptimized className="h-full w-full object-cover" /> : <BookOpen className="h-7 w-7 text-slate-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-slate-900">{book.title}</h2>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${book.status === 'Published' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{book.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{book.author || 'Author not listed'}{book.category ? ` · ${book.category}` : ''}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                    {book.has_pdf && <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> PDF</span>}
                    {book.has_text && <span>Text edition</span>}
                    {!book.has_pdf && !book.has_text && <span>Reading content missing</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void openEditBook(book)} disabled={editing} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"><Pencil className="h-4 w-4" /> Edit</button>
                  <button type="button" onClick={() => void removeBook(book)} aria-label={`Remove ${book.title}`} className="rounded-lg border border-rose-100 p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {draft && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="book-form-title">
          <form onSubmit={saveBook} className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-[0.15em] text-teal-700">Collection management</p><h2 id="book-form-title" className="mt-1 text-xl font-black">{draft.id ? 'Edit book' : 'Add a book'}</h2></div>
              <button type="button" onClick={() => setDraft(null)} aria-label="Close form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">Title *
                <input required maxLength={255} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" />
              </label>
              <label className="text-sm font-semibold text-slate-700">Author
                <input maxLength={255} value={draft.author} onChange={(event) => setDraft({ ...draft, author: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" />
              </label>
              <label className="text-sm font-semibold text-slate-700">Category
                <input maxLength={150} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="Biblical studies, leadership..." className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" />
              </label>
              <label className="text-sm font-semibold text-slate-700">Publication
                <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as BookDraft['status'] })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal">
                  <option value="Draft">Draft — hidden from students</option>
                  <option value="Published">Published — available to students</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Description
                <textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" />
              </label>
              <label className="rounded-xl border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-700">
                <span className="flex items-center gap-2"><UploadCloud className="h-4 w-4 text-teal-700" /> PDF book (max 30 MB)</span>
                <input type="file" accept="application/pdf,.pdf" onChange={(event) => setDraft({ ...draft, pdf: event.target.files?.[0] ?? null })} className="mt-3 block w-full text-xs font-normal" />
                <span className="mt-2 block text-xs font-normal text-slate-500">{draft.pdf?.name ?? (draft.filePath ? 'A PDF is already uploaded' : 'Or add the reading text below')}</span>
              </label>
              <label className="rounded-xl border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-700">
                <span className="flex items-center gap-2"><ImagePlus className="h-4 w-4 text-teal-700" /> Cover image (optional)</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setDraft({ ...draft, cover: event.target.files?.[0] ?? null })} className="mt-3 block w-full text-xs font-normal" />
                <span className="mt-2 block text-xs font-normal text-slate-500">{draft.cover?.name ?? (draft.coverPath ? 'A cover is already uploaded' : 'JPG, PNG, or WebP')}</span>
              </label>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Reading text
                <textarea rows={8} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} placeholder="Paste an authorized text edition here, or upload a PDF above." className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal" />
              </label>
            </div>
            {notice && <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{notice}</p>}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setDraft(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{saving ? 'Saving…' : 'Save book'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
