'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Minus, Moon, Plus, Sparkles, Sun, StickyNote, X } from 'lucide-react';
import { assignmentTextParagraphs, splitAnnotatedText, type AssignmentAnnotation } from '@/lib/assignment-annotations';

export type SubmissionAnnotation = AssignmentAnnotation;

type ReadingTheme = 'light' | 'high-contrast' | 'sepia';
type ReviewPanel = 'mark' | 'comments' | 'checks' | 'ai';
type WritingIssue = { category: string; message: string; quote?: string };
export type AssignmentAiReview = {
  summary: string;
  strengths: string[];
  issues: Array<{ category: string; passage: string; explanation: string; suggested_revision: string }>;
  rubric_assessment: string[];
  ai_likelihood_percent: number;
  ai_confidence: 'low' | 'medium' | 'high';
  authorship_signals: string[];
  authorship_note: string;
  limitations: string;
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
  onAiCheck: () => Promise<AssignmentAiReview>;
}

const highlightClasses: Record<NonNullable<SubmissionAnnotation['color']>, string> = {
  yellow: 'bg-yellow-200 text-slate-950',
  green: 'bg-emerald-200 text-slate-950',
  blue: 'bg-sky-200 text-slate-950',
};

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
  onAiCheck,
}: AssignmentReaderProps) {
  const [zoom, setZoom] = useState(100);
  const [theme, setTheme] = useState<ReadingTheme>('light');
  const [activePanel, setActivePanel] = useState<ReviewPanel>('mark');
  const [quote, setQuote] = useState('');
  const [selectionAnchor, setSelectionAnchor] = useState<Pick<SubmissionAnnotation, 'paragraph_index' | 'start_offset' | 'end_offset'> | null>(null);
  const [comment, setComment] = useState('');
  const [grade, setGrade] = useState(initialGrade === null ? '' : String(initialGrade));
  const [feedback, setFeedback] = useState(initialFeedback);
  const [annotations, setAnnotations] = useState<SubmissionAnnotation[]>(initialAnnotations);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [spellcheckDraft, setSpellcheckDraft] = useState('');
  const [writingIssues, setWritingIssues] = useState<WritingIssue[] | null>(null);
  const [aiReview, setAiReview] = useState<AssignmentAiReview | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const paragraphs = useMemo(() => assignmentTextParagraphs(assignmentContent), [assignmentContent]);
  const plainText = useMemo(() => paragraphs.join('\n\n'), [paragraphs]);

  if (!isOpen) return null;

  const captureSelection = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString() ?? '';
    const selectedQuote = selectedText.trim();
    setQuote(selectedQuote);
    setSelectionAnchor(null);
    if (selectedQuote) setActivePanel('comments');
    if (!selection || !selectedQuote || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const getParagraph = (node: Node) => node instanceof Element
      ? node.closest('p')
      : node.parentElement?.closest('p');
    const paragraph = getParagraph(range.startContainer);
    if (!paragraph || !getParagraph(range.endContainer)?.isSameNode(paragraph)) return;
    const articleParagraphs = Array.from(paragraph.parentElement?.querySelectorAll('p') ?? []);
    const paragraphIndex = articleParagraphs.indexOf(paragraph);
    if (paragraphIndex < 0) return;
    const startRange = document.createRange();
    startRange.selectNodeContents(paragraph);
    startRange.setEnd(range.startContainer, range.startOffset);
    const leadingText = startRange.toString();
    const selectedWithinParagraph = range.toString();
    const startOffset = leadingText.length + selectedText.length - selectedText.trimStart().length;
    if (selectedWithinParagraph.trim() !== selectedQuote || startOffset + selectedQuote.length > paragraph.textContent!.length) return;
    setSelectionAnchor({
      paragraph_index: paragraphIndex,
      start_offset: startOffset,
      end_offset: startOffset + selectedQuote.length,
    });
  };
  const clearSelection = () => {
    setQuote('');
    setSelectionAnchor(null);
    window.getSelection()?.removeAllRanges();
  };
  const getSelectionAnchor = () => selectionAnchor ?? {};
  const addHighlight = (color: NonNullable<SubmissionAnnotation['color']>) => {
    if (!quote) return;
    setAnnotations((current) => [...current, {
      id: crypto.randomUUID(),
      kind: 'highlight',
      quote,
      color,
      created_at: new Date().toISOString(),
      ...getSelectionAnchor(),
    }]);
    clearSelection();
  };
  const addComment = () => {
    if (!quote || !comment.trim()) return;
    setAnnotations((current) => [...current, {
      id: crypto.randomUUID(),
      kind: 'comment',
      quote,
      comment: comment.trim(),
      created_at: new Date().toISOString(),
      color: 'blue',
      ...getSelectionAnchor(),
    }]);
    setComment('');
    clearSelection();
  };
  const runWritingChecks = () => {
    const issues: WritingIssue[] = [];
    const spellingPatterns = [
      ['teh', 'the'], ['recieve', 'receive'], ['seperate', 'separate'],
      ['definately', 'definitely'], ['occured', 'occurred'], ['accomodate', 'accommodate'],
      ['untill', 'until'], ['thier', 'their'], ['alot', 'a lot'], ['becuase', 'because'],
    ] as const;
    for (const [misspelling, correction] of spellingPatterns) {
      const match = new RegExp(`\\b${misspelling}\\b`, 'i').exec(plainText);
      if (match) issues.push({ category: 'Spelling', message: `Possible misspelling; consider “${correction}”.`, quote: match[0] });
    }
    if (/\s+[,.!?;:]/.test(plainText)) {
      issues.push({ category: 'Punctuation', message: 'There may be spaces before punctuation marks.' });
    }
    const repeatedPunctuation = /([!?])\1+|,{2,}|;{2,}/.exec(plainText);
    if (repeatedPunctuation) {
      issues.push({ category: 'Punctuation', message: 'Repeated punctuation may need review.', quote: repeatedPunctuation[0] });
    }
    const lowercaseSentenceStart = /(?:^|[.!?]\s+)([a-z])/m.exec(plainText);
    if (lowercaseSentenceStart) {
      issues.push({ category: 'Grammar and capitalization', message: 'A sentence may begin with a lowercase letter.', quote: lowercaseSentenceStart[1] });
    }
    const repeatedWord = /\b([a-z]+)\s+\1\b/i.exec(plainText);
    if (repeatedWord) {
      issues.push({ category: 'Grammar', message: 'A word appears to be repeated consecutively.', quote: repeatedWord[0] });
    }

    const markup = new DOMParser().parseFromString(assignmentContent, 'text/html');
    const styledRuns = Array.from(markup.querySelectorAll('[style]'));
    if (styledRuns.length === 0) {
      issues.push({ category: 'Font formatting', message: 'No explicit font size or typeface was found; expected Arial, 14 pt.' });
    } else {
      styledRuns.forEach((element) => {
        let current: HTMLElement | null = element as HTMLElement;
        let family = '';
        let size = '';
        while (current && (!family || !size)) {
          family ||= current.style.fontFamily.replace(/["']/g, '').split(',')[0].trim();
          size ||= current.style.fontSize.trim().toLowerCase();
          current = current.parentElement;
        }
        const excerpt = element.textContent?.trim().slice(0, 100) || undefined;
        if (family && family.toLowerCase() !== 'arial') {
          issues.push({ category: 'Typeface', message: `Found ${family}; expected Arial.`, quote: excerpt });
        }
        if (size && size !== '14pt') {
          issues.push({ category: 'Font size', message: `Found ${size}; expected 14 pt.`, quote: excerpt });
        }
        if (!family || !size) {
          issues.push({ category: 'Font formatting', message: 'Some text has no explicit typeface or size; expected Arial, 14 pt.', quote: excerpt });
        }
      });
    }
    setWritingIssues(issues);
    setSpellcheckDraft(plainText);
  };
  const runAiReview = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      setAiReview(await onAiCheck());
    } catch (cause) {
      setAiError(cause instanceof Error ? cause.message : 'Unable to review this assignment with AI.');
    } finally {
      setAiLoading(false);
    }
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
  const renderParagraph = (paragraph: string, paragraphIndex: number) => {
    return splitAnnotatedText(paragraph, paragraphIndex, annotations).map((part, index) => {
      if (!part.annotations.length) return <span key={`${index}-${part.text}`}>{part.text}</span>;
      const annotation = part.annotations[part.annotations.length - 1];
      const hasComment = part.annotations.some((item) => item.kind === 'comment' && item.comment);
      return <mark
        key={`${index}-${part.text}`}
        title={part.annotations.map((item) => item.comment).filter(Boolean).join('\n') || 'Lecturer highlight'}
        data-annotation-ids={part.annotations.map((item) => item.id).join(' ')}
        className={`rounded px-0.5 ${highlightClasses[annotation.color ?? (hasComment ? 'blue' : 'yellow')]} ${hasComment ? 'decoration-2 underline decoration-blue-700 underline-offset-2' : ''}`}
      >{part.text}</mark>;
    });
  };
  const scrollToAnnotation = (annotationId: string) => {
    Array.from(document.querySelectorAll<HTMLElement>('[data-annotation-ids]'))
      .find((element) => element.dataset.annotationIds?.split(' ').includes(annotationId))
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const panelTabs: Array<{ id: ReviewPanel; label: string; count?: number }> = [
    { id: 'mark', label: 'Mark' },
    { id: 'comments', label: 'Comments', count: annotations.length },
    { id: 'checks', label: 'Writing checks', count: writingIssues?.length },
    { id: 'ai', label: 'AI review' },
  ];

  return (
    <div className={`fixed inset-0 z-[70] flex flex-col overflow-hidden ${themeClasses}`}>
      <header className="z-10 flex shrink-0 items-center justify-between gap-4 border-b border-slate-800 bg-slate-950 px-4 py-3 text-white shadow-lg sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-900 text-amber-300 sm:flex"><StickyNote size={19} /></div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black sm:text-base">{assignmentTitle}</p>
            <p className="truncate text-xs text-slate-300">Marking submission · {studentName}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <div className="mr-1 hidden items-center rounded-lg border border-slate-700 sm:flex">
            <button type="button" onClick={() => setZoom((value) => Math.max(70, value - 10))} aria-label="Zoom out" className="rounded-l-lg p-2 hover:bg-white/10"><Minus size={15} /></button>
            <span className="w-12 text-center text-[11px] font-bold">{zoom}%</span>
            <button type="button" onClick={() => setZoom((value) => Math.min(160, value + 10))} aria-label="Zoom in" className="rounded-r-lg p-2 hover:bg-white/10"><Plus size={15} /></button>
          </div>
          <button type="button" onClick={() => setTheme((value) => value === 'light' ? 'high-contrast' : value === 'high-contrast' ? 'sepia' : 'light')} aria-label="Change contrast" title="Change reading contrast" className="rounded-lg p-2 hover:bg-white/10">{theme === 'high-contrast' ? <Moon size={17} /> : <Sun size={17} />}</button>
          <button type="button" onClick={onClose} aria-label="Close reader" title="Close marking workspace" className="rounded-lg p-2 hover:bg-white/10"><X size={19} /></button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(220px,0.9fr)_minmax(300px,1.1fr)] lg:grid-rows-1 lg:grid-cols-[minmax(0,1fr)_minmax(370px,440px)] 2xl:grid-cols-[minmax(0,1fr)_480px]">
        <main className="flex min-h-0 flex-col bg-slate-100 text-slate-900" onMouseUp={captureSelection}>
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-7">
            <div>
              <h1 className="text-xs font-black uppercase tracking-widest text-slate-800">Student submission</h1>
              <p className="mt-0.5 text-[11px] text-slate-500">Select a passage to highlight it or attach a comment.</p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 sm:hidden">
              <button type="button" onClick={() => setZoom((value) => Math.max(70, value - 10))} aria-label="Zoom out" className="rounded-l-lg p-2 text-slate-600 hover:bg-slate-100"><Minus size={14} /></button>
              <span className="w-10 text-center text-[10px] font-bold text-slate-600">{zoom}%</span>
              <button type="button" onClick={() => setZoom((value) => Math.min(160, value + 10))} aria-label="Zoom in" className="rounded-r-lg p-2 text-slate-600 hover:bg-slate-100"><Plus size={14} /></button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-8 lg:px-10">
            <article className={`mx-auto min-h-full max-w-4xl rounded-xl border p-6 shadow-sm sm:p-10 lg:p-12 ${theme === 'high-contrast' ? 'border-black bg-black text-white' : theme === 'sepia' ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-slate-200 bg-white text-slate-900'}`} style={{ fontSize: `${zoom * 0.2}px`, lineHeight: 1.85 }}>
              {paragraphs.length
                ? paragraphs.map((paragraph, index) => <p key={index} className="mb-6 whitespace-pre-wrap last:mb-0">{renderParagraph(paragraph, index)}</p>)
                : <p className="italic text-slate-500">This submission has no readable text.</p>}
            </article>
          </div>
          <div className="hidden shrink-0 items-center justify-between border-t border-slate-200 bg-white px-7 py-2 text-[10px] text-slate-500 lg:flex">
            <span>{paragraphs.length} paragraphs · {plainText.trim().split(/\s+/).filter(Boolean).length} words</span>
            <span>{annotations.length} saved annotations</span>
          </div>
        </main>

        <aside className="flex min-h-0 flex-col border-t border-slate-200 bg-white text-slate-900 lg:border-l lg:border-t-0">
          <nav role="tablist" aria-label="Marking tools" className="flex shrink-0 overflow-x-auto border-b border-slate-200 bg-slate-50 px-2 sm:px-3">
            {panelTabs.map((tab) => (
              <button
                key={tab.id}
                id={`marking-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={activePanel === tab.id}
                aria-controls={`marking-panel-${tab.id}`}
                onClick={() => setActivePanel(tab.id)}
                className={`relative flex shrink-0 items-center gap-1.5 px-3 py-3 text-xs font-bold transition-colors sm:px-4 ${activePanel === tab.id ? 'text-blue-900' : 'text-slate-500 hover:text-slate-900'}`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${activePanel === tab.id ? 'bg-blue-100 text-blue-900' : 'bg-slate-200 text-slate-600'}`}>{tab.count}</span>}
                {activePanel === tab.id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-blue-900" />}
              </button>
            ))}
          </nav>

          <div id={`marking-panel-${activePanel}`} role="tabpanel" aria-labelledby={`marking-tab-${activePanel}`} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            {activePanel === 'mark' && <div className="mx-auto max-w-xl space-y-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-900">Assessment outcome</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">Mark and feedback</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Set the mark and share clear, actionable feedback with the student.</p>
              </div>
              <label className="block text-xs font-bold text-slate-700">Mark <span className="font-normal text-slate-500">out of {maximumGrade}</span>
                <div className="mt-2 flex items-center gap-3">
                  <input type="number" min="0" max={maximumGrade} step="0.01" value={grade} onChange={(event) => setGrade(event.target.value)} className="w-36 rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg font-black text-slate-950 shadow-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />
                  <span className="text-sm font-semibold text-slate-400">/ {maximumGrade}</span>
                </div>
              </label>
              <label className="block text-xs font-bold text-slate-700">Overall feedback
                <textarea rows={7} value={feedback} onChange={(event) => setFeedback(event.target.value)} className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-700 focus:ring-2 focus:ring-blue-100" placeholder="Summarize what went well and what the student should improve..." />
              </label>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-bold text-blue-950">Quick workflow</p>
                <ol className="mt-2 list-inside list-decimal space-y-1.5 text-[11px] leading-5 text-blue-900">
                  <li>Select a sentence or phrase in the submission.</li>
                  <li>Add a highlight or write a comment on that passage.</li>
                  <li>Enter the mark and overall feedback, then save.</li>
                </ol>
              </div>
            </div>}

            {activePanel === 'comments' && <div className="mx-auto max-w-xl space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-900">Passage notes</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">Highlights and comments</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Select text in the submission. Your note will remain attached to that exact passage.</p>
              </div>
              {quote ? <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-blue-800">Selected passage</p>
                  <blockquote className="mt-2 border-l-2 border-blue-400 pl-3 text-sm leading-6 text-slate-800">“{quote}”</blockquote>
                  {!selectionAnchor && <p className="mt-2 text-[10px] font-semibold text-amber-800">Select text within one paragraph to anchor this note exactly.</p>}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-600">Highlight color</p>
                  <div className="mt-2 flex gap-2">
                    {(['yellow', 'green', 'blue'] as const).map((color) => <button key={color} type="button" disabled={!selectionAnchor} onClick={() => addHighlight(color)} aria-label={`Highlight ${color}`} title={`Highlight ${color}`} className={`h-9 w-9 rounded-lg border border-slate-300 shadow-sm ${highlightClasses[color]} disabled:cursor-not-allowed disabled:opacity-40`} />)}
                  </div>
                </div>
                <label className="block text-xs font-bold text-slate-700">Comment on this passage
                  <textarea rows={3} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Write a specific comment about this selected text..." className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm leading-5 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />
                </label>
                <button type="button" onClick={addComment} disabled={!comment.trim() || !selectionAnchor} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"><StickyNote size={14} />Add passage comment</button>
              </div> : <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                <StickyNote className="mx-auto h-6 w-6 text-slate-400" />
                <p className="mt-2 text-xs font-bold text-slate-700">No passage selected</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">Drag across text in the submission pane to add a highlight or a comment.</p>
              </div>}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-xs font-black uppercase tracking-wide text-slate-700">Saved notes</h3>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{annotations.length}</span>
              </div>
              {annotations.map((annotation) => (
                <article key={annotation.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <blockquote className="border-l-2 border-amber-400 pl-3 text-xs italic leading-5 text-slate-700">“{annotation.quote}”</blockquote>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase ${annotation.kind === 'comment' ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-800'}`}>{annotation.kind === 'comment' ? 'Comment' : 'Highlight'}</span>
                  </div>
                  {annotation.comment && <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-700">{annotation.comment}</p>}
                  <button type="button" onClick={() => scrollToAnnotation(annotation.id)} className="mt-3 text-[10px] font-bold text-blue-800 underline underline-offset-2">Jump to passage</button>
                </article>
              ))}
              {!annotations.length && <p className="text-center text-xs text-slate-500">Your highlights and comments will appear here.</p>}
            </div>}

            {activePanel === 'checks' && <div className="mx-auto max-w-xl space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-900">Proofreading tools</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">Writing and format checks</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Local checks are prompts for review, not definitive corrections.</p>
              </div>
              <button type="button" onClick={runWritingChecks} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-left text-xs font-bold text-slate-800 shadow-sm hover:border-blue-400 hover:bg-blue-50">Run spelling, grammar, punctuation and font checks</button>
              {writingIssues && <>
                <label className="block text-xs font-bold text-slate-700">Browser spell-check copy <span className="font-normal text-slate-500">(editing this copy does not change the submission)</span>
                  <textarea rows={6} spellCheck value={spellcheckDraft} onChange={(event) => setSpellcheckDraft(event.target.value)} className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs leading-5 text-slate-800 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />
                </label>
                {writingIssues.length === 0
                  ? <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800"><CheckCircle2 size={15} />No issues found by the local checks.</p>
                  : <ul className="space-y-2" aria-label="Writing check findings">
                    {writingIssues.map((issue, index) => <li key={`${issue.category}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5">
                      <span className="font-black text-slate-800">{issue.category}</span><p className="mt-1 text-slate-600">{issue.message}</p>
                      {issue.quote && <span className="mt-2 block rounded bg-amber-50 px-2 py-1 italic text-amber-900">“{issue.quote}”</span>}
                    </li>)}
                  </ul>}
              </>}
            </div>}

            {activePanel === 'ai' && <div className="mx-auto max-w-xl space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-900">Advisory review</p>
                <h2 className="mt-1 flex items-center gap-2 text-lg font-black text-slate-950"><Sparkles size={19} className="text-blue-800" />AI assignment checker</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">The assignment brief, rubric and submission are sent to OpenAI only when you request a review. AI advice does not set or save the mark.</p>
              </div>
              <button type="button" onClick={() => void runAiReview()} disabled={aiLoading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-3 text-xs font-bold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50">
                {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {aiLoading ? 'Reviewing submission…' : aiReview ? 'Run AI review again' : 'Run AI review'}
              </button>
              {aiError && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700"><AlertCircle size={15} className="mt-0.5 shrink-0" />{aiError}</p>}
              {aiReview && <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-5 shadow-sm">
                  <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                      <div
                        role="img"
                        aria-label={`AI-likeness estimate: ${aiReview.ai_likelihood_percent} percent. Confidence: ${aiReview.ai_confidence}. This is not a measurement of actual AI use.`}
                        className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full"
                        style={{ background: `conic-gradient(#dc2626 ${aiReview.ai_likelihood_percent}%, #e2e8f0 ${aiReview.ai_likelihood_percent}% 100%)` }}
                      >
                        <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center shadow-inner">
                          <div>
                            <p className="text-3xl font-black leading-none text-slate-950">{aiReview.ai_likelihood_percent}%</p>
                            <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-500">AI-like signals</p>
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900">AI-likeness estimate</p>
                        <p className="mt-1 text-xs text-slate-600">Confidence: <span className="font-bold capitalize">{aiReview.ai_confidence}</span></p>
                        <p className="mt-2 text-[11px] leading-5 text-slate-600">{aiReview.authorship_note}</p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-950">
                      This percentage is a heuristic from writing patterns, not a measured probability that AI was used. It cannot verify authorship or originality. Do not use it alone to accuse, penalize, or make an academic-integrity decision.
                    </div>
                    {aiReview.authorship_signals.length > 0 && <div className="mt-4">
                      <h3 className="font-black text-slate-900">Signals considered</h3>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">{aiReview.authorship_signals.map((item, index) => <li key={index}>{item}</li>)}</ul>
                    </div>}
                  </section>
                  <p className="text-slate-700">{aiReview.summary}</p>
                {aiReview.strengths.length > 0 && <div><h3 className="font-black text-slate-900">Strengths</h3><ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">{aiReview.strengths.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
                {aiReview.issues.length > 0 && <div><h3 className="font-black text-slate-900">Suggestions</h3><ul className="mt-2 space-y-2">{aiReview.issues.map((item, index) => <li key={index} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="font-black text-slate-800">{item.category}</p>
                  {item.passage && <p className="mt-1 italic text-slate-500">“{item.passage}”</p>}
                  <p className="mt-2 text-slate-700">{item.explanation}</p>
                  {item.suggested_revision && <p className="mt-2 text-slate-600"><span className="font-bold">Suggestion: </span>{item.suggested_revision}</p>}
                </li>)}</ul></div>}
                {aiReview.rubric_assessment.length > 0 && <div><h3 className="font-black text-slate-900">Against the rubric</h3><ul className="mt-1 list-disc space-y-1 pl-4 text-slate-700">{aiReview.rubric_assessment.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
                <p className="border-t border-slate-200 pt-3 text-[10px] leading-4 text-slate-500">{aiReview.limitations}</p>
              </div>}
            </div>}
          </div>

          <footer className="shrink-0 border-t border-slate-200 bg-white p-3.5 sm:px-5 sm:py-4">
            {error && <p role="alert" className="mb-2 text-xs font-semibold text-red-600">{error}</p>}
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] leading-4 text-slate-500">Highlights, comments, mark and feedback save together.</p>
              <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'Saving…' : 'Save marking'}
              </button>
            </div>
          </footer>
        </aside>
      </div>
    </div>
  );
}
