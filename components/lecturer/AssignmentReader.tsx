'use client';

import { useMemo, useState } from 'react';
import { Minus, Moon, Plus, Sun, StickyNote, X } from 'lucide-react';

export type SubmissionAnnotation = {
  id: string;
  kind: 'highlight' | 'comment';
  quote: string;
  color?: 'yellow' | 'green' | 'blue';
  comment?: string;
  created_at: string;
};

interface AssignmentReaderProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  assignmentTitle: string;
  assignmentContent: string;
  maximumGrade: number;
  initialGrade: number | null;
  initialFeedback: string;
  initialAnnotations: SubmissionAnnotation[];
  onSaveFeedback: (grade: number, feedback: string, annotations: SubmissionAnnotation[]) => Promise<void>;
}

type ReadingTheme = 'light' | 'high-contrast' | 'sepia';
const highlightClasses: Record<NonNullable<SubmissionAnnotation['color']>, string> = {
  yellow: 'bg-yellow-200 text-slate-950',
  green: 'bg-emerald-200 text-slate-950',
  blue: 'bg-sky-200 text-slate-950',
};

function submissionParagraphs(content: string | null | undefined): string[] {
  const decoded = (content ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|li|blockquote|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'");
  return decoded.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

export default function AssignmentReader({
  isOpen,
  onClose,
  studentName,
  assignmentTitle,
  assignmentContent,
  maximumGrade,
  initialGrade,
  initialFeedback,
  initialAnnotations,
  onSaveFeedback,
}: AssignmentReaderProps) {
  const [zoom, setZoom] = useState(100);
  const [theme, setTheme] = useState<ReadingTheme>('light');
  const [quote, setQuote] = useState('');
  const [comment, setComment] = useState('');
  const [grade, setGrade] = useState(initialGrade === null ? '' : String(initialGrade));
  const [feedback, setFeedback] = useState(initialFeedback);
  const [annotations, setAnnotations] = useState<SubmissionAnnotation[]>(initialAnnotations);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const paragraphs = useMemo(() => submissionParagraphs(assignmentContent), [assignmentContent]);

  if (!isOpen) return null;

  const captureSelection = () => {
    const selection = window.getSelection()?.toString().trim() ?? '';
    setQuote(selection);
  };
  const addHighlight = (color: NonNullable<SubmissionAnnotation['color']>) => {
    if (!quote) return;
    setAnnotations((current) => [...current, {
      id: crypto.randomUUID(),
      kind: 'highlight',
      quote,
      color,
      created_at: new Date().toISOString(),
    }]);
    setQuote('');
    window.getSelection()?.removeAllRanges();
  };
  const addComment = () => {
    if (!quote || !comment.trim()) return;
    setAnnotations((current) => [...current, {
      id: crypto.randomUUID(),
      kind: 'comment',
      quote,
      comment: comment.trim(),
      created_at: new Date().toISOString(),
    }]);
    setComment('');
    setQuote('');
    window.getSelection()?.removeAllRanges();
  };
  const save = async () => {
    const mark = Number(grade);
    if (!Number.isFinite(mark) || mark < 0 || mark > maximumGrade) {
      setError(`Enter a mark between 0 and ${maximumGrade}.`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSaveFeedback(mark, feedback, annotations);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this mark.');
    } finally {
      setSaving(false);
    }
  };
  const themeClasses = theme === 'high-contrast'
    ? 'bg-black text-white'
    : theme === 'sepia'
      ? 'bg-amber-50 text-amber-950'
      : 'bg-white text-slate-900';
  const renderParagraph = (paragraph: string) => {
    const highlights = annotations.filter((item) => item.kind === 'highlight' && item.quote);
    let parts: Array<{ text: string; color?: NonNullable<SubmissionAnnotation['color']> }> = [{ text: paragraph }];
    for (const item of highlights) {
      const next: typeof parts = [];
      for (const part of parts) {
        if (part.color) {
          next.push(part);
          continue;
        }
        const index = part.text.indexOf(item.quote);
        if (index < 0) {
          next.push(part);
          continue;
        }
        if (index) next.push({ text: part.text.slice(0, index) });
        next.push({ text: item.quote, color: item.color ?? 'yellow' });
        if (index + item.quote.length < part.text.length) next.push({ text: part.text.slice(index + item.quote.length) });
      }
      parts = next;
    }
    return parts.map((part, index) => part.color
      ? <mark key={`${index}-${part.text}`} className={`rounded px-0.5 ${highlightClasses[part.color]}`}>{part.text}</mark>
      : <span key={`${index}-${part.text}`}>{part.text}</span>);
  };

  return (
    <div className={`fixed inset-0 z-[70] flex flex-col ${themeClasses}`}>
      <header className="flex items-center justify-between gap-4 border-b border-current/15 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{assignmentTitle}</p>
          <p className="truncate text-xs opacity-70">Submission by {studentName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => setZoom((value) => Math.max(70, value - 10))} aria-label="Zoom out" className="rounded-lg p-2 hover:bg-current/10"><Minus size={16} /></button>
          <span className="w-12 text-center text-xs font-bold">{zoom}%</span>
          <button type="button" onClick={() => setZoom((value) => Math.min(160, value + 10))} aria-label="Zoom in" className="rounded-lg p-2 hover:bg-current/10"><Plus size={16} /></button>
          <button type="button" onClick={() => setTheme((value) => value === 'light' ? 'high-contrast' : value === 'high-contrast' ? 'sepia' : 'light')} aria-label="Change contrast" className="rounded-lg p-2 hover:bg-current/10">{theme === 'high-contrast' ? <Moon size={16} /> : <Sun size={16} />}</button>
          <button type="button" onClick={onClose} aria-label="Close reader" className="rounded-lg p-2 hover:bg-current/10"><X size={18} /></button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_340px]">
        <main className="overflow-y-auto px-5 py-8 sm:px-10" onMouseUp={captureSelection}>
          <article className="mx-auto max-w-3xl space-y-6 leading-relaxed" style={{ fontSize: `${zoom * 0.18}px` }}>
            {paragraphs.length
              ? paragraphs.map((paragraph, index) => <p key={index} className="whitespace-pre-wrap">{renderParagraph(paragraph)}</p>)
              : <p className="italic opacity-60">This submission has no readable text.</p>}
          </article>
        </main>

        <aside className="flex min-h-0 flex-col border-l border-current/15">
          <section className="space-y-3 border-b border-current/15 p-4">
            <h2 className="text-sm font-black">Mark and feedback</h2>
            <label className="block text-xs font-semibold">Mark (out of {maximumGrade})
              <input type="number" min="0" max={maximumGrade} step="0.01" value={grade} onChange={(event) => setGrade(event.target.value)} className="mt-1 w-full rounded-lg border border-current/20 bg-transparent px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-semibold">Overall feedback
              <textarea rows={4} value={feedback} onChange={(event) => setFeedback(event.target.value)} className="mt-1 w-full resize-y rounded-lg border border-current/20 bg-transparent px-3 py-2 text-sm" placeholder="Feedback for the student" />
            </label>
            {error && <p role="alert" className="text-xs font-semibold text-red-500">{error}</p>}
            <button type="button" disabled={saving} onClick={() => void save()} className="w-full rounded-lg bg-blue-900 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{saving ? 'Saving mark…' : 'Save mark and feedback'}</button>
          </section>

          <section className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black">Reading notes</h2>
              <span className="text-[10px] font-semibold opacity-60">{annotations.length} annotations</span>
            </div>
            {quote && (
              <div className="space-y-2 rounded-xl border border-current/20 p-3">
                <p className="line-clamp-3 text-xs italic opacity-75">“{quote}”</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold">Highlight:</span>
                  {(['yellow', 'green', 'blue'] as const).map((color) => <button key={color} type="button" onClick={() => addHighlight(color)} aria-label={`Highlight ${color}`} className={`h-6 w-6 rounded-full border border-current/20 ${highlightClasses[color]}`} />)}
                </div>
                <textarea rows={2} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Comment on selected text" className="w-full rounded-lg border border-current/20 bg-transparent px-2 py-1.5 text-xs" />
                <button type="button" onClick={addComment} disabled={!comment.trim()} className="inline-flex items-center gap-1 rounded-lg border border-current/20 px-3 py-1.5 text-xs font-bold disabled:opacity-40"><StickyNote size={13} /> Add comment</button>
              </div>
            )}
            {annotations.map((annotation) => (
              <article key={annotation.id} className="space-y-1 rounded-xl border border-current/15 p-3">
                <p className="text-xs italic opacity-70">“{annotation.quote}”</p>
                {annotation.kind === 'highlight'
                  ? <p className="text-[10px] font-bold">Highlighted text</p>
                  : <p className="text-xs">{annotation.comment}</p>}
              </article>
            ))}
            {!annotations.length && !quote && <p className="text-xs opacity-60">Select text in the submission to add highlights or comments.</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}
