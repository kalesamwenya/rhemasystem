'use client';

import { useState } from 'react';
import { Loader2, MessageSquareText } from 'lucide-react';
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const response = await api.students.requestActivityAccess({
        activity_type: activityType,
        activity_id: activityId,
        course_id: courseId,
        reason: reason.trim(),
      }) as { message?: string };
      setNotice(response.message || 'Your request has been sent to Finance.');
      setReason('');
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
      {open && <form onSubmit={(event) => void submitRequest(event)} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-left">
        <p className="text-xs leading-5 text-slate-600">Finance will review an invoice for <span className="font-bold">{activityName}</span>, then send the access request to IT for approval. The invoice remains on your student account.</p>
        <label className="block text-xs font-bold text-slate-700">Why do you need access?
          <textarea required maxLength={2000} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-700" />
        </label>
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-600">Cancel</button><button type="submit" disabled={submitting || !reason.trim()} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-xs font-black text-white disabled:opacity-60">{submitting && <Loader2 size={13} className="animate-spin" />}Send to Finance</button></div>
      </form>}
    </div>
  );
}
