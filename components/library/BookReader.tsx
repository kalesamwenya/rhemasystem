'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Bookmark, Minus, Plus, Save, Settings2, Speaker, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';

export type BookData = {
  id: number;
  title: string;
  author: string;
  content?: string;
  description?: string;
  category?: string;
  cover_path?: string;
  has_pdf?: boolean;
  progress_percent?: number;
};

type BookReaderProps = {
  book?: BookData;
  isOpen: boolean;
  onClose: () => void;
};

type Annotation = {
  id: number;
  annotation_type: 'bookmark' | 'note' | 'highlight';
  position_percent: number;
  selected_text: string | null;
  note_text: string | null;
  color: string;
  created_at: string;
};

type ReaderTheme = 'paper' | 'light' | 'night';

const themeStyles: Record<ReaderTheme, { shell: string; page: string; text: string }> = {
  paper: { shell: 'bg-[#f7f4eb]', page: 'border-[#e8e1d3] bg-[#fffdf7]', text: 'text-[#302f2b]' },
  light: { shell: 'bg-slate-100', page: 'border-slate-200 bg-white', text: 'text-slate-800' },
  night: { shell: 'bg-slate-950', page: 'border-slate-700 bg-slate-900', text: 'text-slate-100' },
};

const highlightStyles: Record<string, string> = {
  amber: 'bg-amber-200/80 text-inherit',
  yellow: 'bg-yellow-200/80 text-inherit',
  green: 'bg-emerald-200/80 text-inherit',
  blue: 'bg-sky-200/80 text-inherit',
  pink: 'bg-pink-200/80 text-inherit',
};

function renderHighlightedText(text: string, annotations: Annotation[]) {
  const ranges: Array<{ start: number; end: number; color: string }> = [];
  annotations
    .filter((annotation) => annotation.annotation_type === 'highlight' && annotation.selected_text)
    .forEach((annotation) => {
      const start = text.indexOf(annotation.selected_text ?? '');
      if (start < 0) return;
      const end = start + (annotation.selected_text?.length ?? 0);
      if (!ranges.some((range) => start < range.end && end > range.start)) {
        ranges.push({ start, end, color: annotation.color });
      }
    });
  ranges.sort((left, right) => left.start - right.start);
  if (!ranges.length) return text;
  const pieces: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((range) => {
    if (range.start > cursor) pieces.push(text.slice(cursor, range.start));
    pieces.push(<mark key={`${range.start}-${range.end}`} className={`rounded px-0.5 ${highlightStyles[range.color] ?? highlightStyles.amber}`}>{text.slice(range.start, range.end)}</mark>);
    cursor = range.end;
  });
  if (cursor < text.length) pieces.push(text.slice(cursor));
  return pieces;
}

export default function BookReader({ book, isOpen, onClose }: BookReaderProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [fontSize, setFontSize] = useState(18);
  const [theme, setTheme] = useState<ReaderTheme>('paper');
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [error, setError] = useState('');
  const [showNotes, setShowNotes] = useState(true);
  const readerRef = useRef<HTMLElement>(null);
  const progressTimer = useRef<number | null>(null);
  const bookId = book ? Number(book.id) : 0;
  const savedProgress = book?.progress_percent ?? 0;
  const [progress, setProgress] = useState(savedProgress);
  const colors = themeStyles[theme];
  const text = book?.content?.trim() || book?.description?.trim() || '';
  const paragraphs = text.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const saveProgress = useCallback(async (nextProgress: number) => {
    if (!bookId || !Number.isFinite(nextProgress)) return;
    try {
      await api.library.saveBookProgress({
        book_id: bookId,
        progress_percent: Math.max(0, Math.min(100, Math.round(nextProgress))),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save reading progress.');
    }
  }, [bookId]);

  const loadAnnotations = useCallback(async () => {
    if (!bookId) return;
    try {
      const response = await api.library.bookAnnotations(bookId) as { data?: Annotation[] };
      setAnnotations(response.data ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your notes and bookmarks.');
    }
  }, [bookId]);

  useEffect(() => {
    if (!isOpen || !bookId) return;
    const timer = window.setTimeout(() => { void loadAnnotations(); }, 0);
    return () => {
      window.clearTimeout(timer);
      if (progressTimer.current !== null) window.clearTimeout(progressTimer.current);
    };
  }, [bookId, isOpen, loadAnnotations]);

  useEffect(() => {
    if (!isOpen || !book?.has_pdf || !bookId) {
      return;
    }
    let active = true;
    let createdUrl = '';
    api.library.readBook(bookId)
      .then((file: Blob) => {
        createdUrl = URL.createObjectURL(file);
        if (active) setPdfUrl(createdUrl);
        else URL.revokeObjectURL(createdUrl);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load the PDF.');
      });
    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [book?.has_pdf, bookId, isOpen]);

  useEffect(() => {
    if (!isOpen || !readerRef.current || book?.has_pdf || !savedProgress) return;
    const frame = window.requestAnimationFrame(() => {
      const element = readerRef.current;
      if (!element) return;
      element.scrollTop = (savedProgress / 100) * (element.scrollHeight - element.clientHeight);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [book?.has_pdf, bookId, isOpen, savedProgress]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const updateProgress = (nextProgress: number) => {
    const normalized = Math.max(0, Math.min(100, Math.round(nextProgress)));
    setProgress(normalized);
    if (!book?.has_pdf && readerRef.current) {
      readerRef.current.scrollTop = (normalized / 100) * (readerRef.current.scrollHeight - readerRef.current.clientHeight);
    }
    if (progressTimer.current !== null) window.clearTimeout(progressTimer.current);
    progressTimer.current = window.setTimeout(() => { void saveProgress(normalized); }, 800);
  };

  const handleReaderScroll = () => {
    if (!readerRef.current || book?.has_pdf) return;
    const { scrollTop, scrollHeight, clientHeight } = readerRef.current;
    const nextProgress = scrollHeight <= clientHeight ? 100 : Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
    setProgress(Math.max(0, Math.min(100, nextProgress)));
    if (progressTimer.current !== null) window.clearTimeout(progressTimer.current);
    progressTimer.current = window.setTimeout(() => { void saveProgress(nextProgress); }, 900);
  };

  const saveAnnotation = async (type: Annotation['annotation_type']) => {
    if (!bookId) return;
    const selectedText = window.getSelection()?.toString().trim().slice(0, 3000) ?? '';
    if (type === 'highlight' && !selectedText) {
      setError('Select some text in the reading area before saving a highlight.');
      return;
    }
    if (type === 'note' && !noteText.trim()) {
      setError('Enter a note before saving it.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.library.saveBookAnnotation({
        book_id: bookId,
        annotation_type: type,
        position_percent: progress,
        selected_text: selectedText,
        note_text: type === 'note' ? noteText.trim() : '',
        color: 'amber',
      });
      setNoteText('');
      window.getSelection()?.removeAllRanges();
      await loadAnnotations();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this annotation.');
    } finally {
      setSaving(false);
    }
  };

  const removeAnnotation = async (annotationId: number) => {
    try {
      await api.library.removeBookAnnotation(annotationId);
      setAnnotations((current) => current.filter((annotation) => annotation.id !== annotationId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove the annotation.');
    }
  };

  const readAloud = () => {
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setError('');
    window.speechSynthesis.speak(utterance);
  };

  const closeReader = () => {
    if (progressTimer.current !== null) window.clearTimeout(progressTimer.current);
    void saveProgress(progress);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    onClose();
  };

  if (!isOpen || !book) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label={`Reading ${book.title}`} className={`fixed inset-0 z-[70] flex flex-col ${colors.shell} ${theme === 'night' ? 'text-slate-100' : 'text-slate-900'}`}>
      <header className="shrink-0 border-b border-slate-200 bg-white px-3 py-3 sm:px-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-800"><BookOpenIcon /></div>
            <div className="min-w-0"><h1 className="truncate text-sm font-black sm:text-base">{book.title}</h1><p className="truncate text-xs text-slate-500">{book.author || 'Author not listed'}</p></div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setFontSize((size) => Math.max(14, size - 1))} aria-label="Decrease text size" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Minus className="h-4 w-4" /></button>
            <span className="w-10 text-center text-xs font-bold text-slate-500">{fontSize}px</span>
            <button type="button" onClick={() => setFontSize((size) => Math.min(28, size + 1))} aria-label="Increase text size" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Plus className="h-4 w-4" /></button>
            <label className="ml-1 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-600">
              <Settings2 className="h-4 w-4" />
              <select aria-label="Reader theme" value={theme} onChange={(event) => setTheme(event.target.value as ReaderTheme)} className="max-w-20 bg-transparent outline-none">
                <option value="paper">Paper</option><option value="light">Light</option><option value="night">Night</option>
              </select>
            </label>
            <button type="button" onClick={() => setShowNotes((shown) => !shown)} aria-expanded={showNotes} className="ml-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Notes {annotations.length}</button>
            <button type="button" onClick={closeReader} aria-label="Close reader" className="ml-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="mx-auto mt-3 flex max-w-7xl items-center gap-3">
          <span className="w-20 shrink-0 text-[11px] font-bold text-slate-500">{progress}% read</span>
          <input aria-label="Reading progress" type="range" min="0" max="100" value={progress} onChange={(event) => updateProgress(Number(event.target.value))} onMouseUp={() => void saveProgress(progress)} onTouchEnd={() => void saveProgress(progress)} className="h-2 w-full accent-teal-700" />
          <span className="w-16 shrink-0 text-right text-[11px] text-slate-500">{book.has_pdf ? 'Set progress' : 'Auto-saved'}</span>
        </div>
      </header>

      <div className={`min-h-0 flex-1 overflow-hidden ${showNotes ? 'flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_300px]' : 'flex flex-col'}`}>
        <main ref={readerRef} onScroll={handleReaderScroll} className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6 sm:py-8">
          {book.has_pdf ? (
            <div className="mx-auto h-[calc(100vh-180px)] max-w-5xl overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
              {pdfUrl ? <iframe title={`Read ${book.title}`} src={`${pdfUrl}#toolbar=1&navpanes=0`} className="h-full w-full border-0" />
                : <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-500">{error || 'Loading secure PDF…'}</div>}
            </div>
          ) : (
            <article className={`mx-auto min-h-full max-w-3xl rounded-2xl border px-6 py-8 shadow-sm sm:px-12 sm:py-12 ${colors.page} ${colors.text}`}>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Rhema Digital Library</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">{book.title}</h2>
              <p className="mt-2 text-sm opacity-70">{book.author}</p>
              <div className="mt-8 space-y-5 leading-8" style={{ fontSize }}>
                {paragraphs.length
                  ? paragraphs.map((paragraph, index) => <p key={index} className="whitespace-pre-wrap">{renderHighlightedText(paragraph, annotations)}</p>)
                  : <p className="italic opacity-70">No reading text is available for this title yet.</p>}
              </div>
            </article>
          )}
        </main>

        {showNotes && (
          <aside className="max-h-[45vh] shrink-0 overflow-y-auto border-t border-slate-200 bg-white p-4 lg:max-h-none lg:border-l lg:border-t-0">
            <h2 className="font-black text-slate-900">Your reading notes</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Select text to highlight or attach a note. Bookmarks save your current reading position.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void saveAnnotation('bookmark')} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Bookmark className="h-3.5 w-3.5" /> Bookmark</button>
              {!book.has_pdf && <button type="button" onClick={() => void saveAnnotation('highlight')} disabled={saving} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 disabled:opacity-50">Highlight selection</button>}
            </div>
            <div className="mt-4">
              <textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} rows={3} maxLength={30000} placeholder="Write a note about this passage…" className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-teal-600" />
              <button type="button" onClick={() => void saveAnnotation('note')} disabled={saving || !noteText.trim()} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Save className="h-3.5 w-3.5" /> Save note</button>
              {!book.has_pdf && text && <button type="button" onClick={readAloud} className="ml-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Speaker className="h-3.5 w-3.5" /> Read aloud</button>}
            </div>
            {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{error}</p>}
            <div className="mt-5 space-y-2">
              {annotations.length === 0 ? <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Your bookmarks, notes, and highlights will appear here.</p> : annotations.map((annotation) => (
                <article key={annotation.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => updateProgress(annotation.position_percent)} className="text-left text-[10px] font-black uppercase tracking-wide text-teal-700 hover:underline">{annotation.annotation_type} · Go to {annotation.position_percent}%</button>
                    <button type="button" aria-label="Delete annotation" onClick={() => void removeAnnotation(annotation.id)} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  {annotation.selected_text && <blockquote className="mt-2 border-l-2 border-amber-400 pl-2 text-xs italic text-slate-600">“{annotation.selected_text}”</blockquote>}
                  {annotation.note_text && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{annotation.note_text}</p>}
                </article>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function BookOpenIcon() {
  return <span aria-hidden="true" className="text-lg font-black leading-none">R</span>;
}
