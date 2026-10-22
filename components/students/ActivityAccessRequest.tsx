'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquareText, X } from 'lucide-react';
import { api } from '@/lib/api';

type Props = {
  activityType: 'quiz' | 'exam' | 'assignment' | 'audio';
  activityId: number;
  courseId?: string;
  activityName: string;
};

export default function ActivityAccessRequest({ activityType, activityId, courseId = '', activityName }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [illnessRelated, setIllnessRelated] = useState(false);
  const [sickNote, setSickNote] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, submitting]);

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sickNote && (sickNote.size > 8 * 1024 * 1024 || !['application/pdf', 'image/jpeg', 'image/png'].includes(sickNote.type))) {
      setError('Attach a PDF, JPG, or PNG sick note smaller than 8 MB.');
      return;
    }
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const formData = new FormData();
      formData.append('activity_type', activityType);
      formData.append('activity_id', String(activityId));
      formData.append('course_id', courseId);
      formData.append('reason', reason.trim());
      formData.append('illness_related', illnessRelated ? '1' : '0');
      if (sickNote) formData.append('sick_note', sickNote);
      const response = await api.students.requestActivityAccess(formData) as { message?: string };
      setNotice(response.message || 'Your request has been sent to Finance.');
      setReason('');
      setIllnessRelated(false);
      setSickNote(null);
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send your request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {notice ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-left text-xs text-emerald-800">{notice} You can follow its progress in <a href="/student/billing" className="font-black underline">Billing &amp; payments</a>.</p> : (
        <button type="button" onClick={() => { setOpen((current) => !current); setError(''); }} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-xs font-black text-blue-900 hover:bg-blue-50">
          <MessageSquareText size={15} /> Ask Finance for access
        </button>
      )}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-left text-xs text-red-800">{error}</p>}
      {open && <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
        onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setOpen(false); }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="activity-access-title"
          aria-describedby="activity-access-description"
          tabIndex={-1}
          className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-2xl outline-none"
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 id="activity-access-title" className="text-base font-black text-slate-950">Request activity access</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">{activityName}</p>
            </div>
            <button type="button" aria-label="Close dialog" disabled={submitting} onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={(event) => void submitRequest(event)} className="space-y-4 p-5">
            <p id="activity-access-description" className="text-sm leading-6 text-slate-600">Finance will review an invoice, then send the access request to IT for approval. The invoice remains on your student account.</p>
            <label className="block text-xs font-bold text-slate-700">Why do you need access?
              <textarea required maxLength={2000} rows={4} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="flex items-start gap-2.5 text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={illnessRelated} onChange={(event) => { setIllnessRelated(event.target.checked); if (!event.target.checked) setSickNote(null); }} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-800 focus:ring-blue-700" />
              <span>This request is related to illness</span>
            </label>
            {illnessRelated && <label className="block text-xs font-bold text-slate-700">
              Attach a sick note <span className="font-normal text-slate-500">(optional)</span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setSickNote(event.target.files?.[0] ?? null)} className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700" />
              <span className="mt-1 block text-[11px] font-normal text-slate-500">PDF, JPG, or PNG, up to 8 MB. Finance and IT can review the attachment.</span>
            </label>}
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" disabled={submitting} onClick={() => setOpen(false)} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={submitting || !reason.trim()} className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
                {submitting && <Loader2 size={14} className="animate-spin" />}{submitting ? 'Sending request…' : 'Send to Finance'}
              </button>
            </div>
          </form>
        </div>
      </div>}
    </div>
  );
}
