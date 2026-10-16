'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

type AttendanceFollowup = {
  id: number;
  course_name: string;
  session_date: string;
  status: 'open' | 'scheduled' | 'completed';
  followup_at: string | null;
  reason_type: 'sick' | 'emergency' | 'other' | null;
  student_reason: string | null;
  sick_note_path: string | null;
  response_submitted_at: string | null;
};

type FollowupResponse = { success: boolean; data: AttendanceFollowup };

export default function StudentAbsenceResponsePage() {
  const searchParams = useSearchParams();
  const followupId = searchParams.get('followup') || '';
  const invalidFollowupId = !/^\d+$/.test(followupId);
  const [followup, setFollowup] = useState<AttendanceFollowup | null>(null);
  const [reasonType, setReasonType] = useState<'sick' | 'emergency' | 'other'>('other');
  const [reason, setReason] = useState('');
  const [sickNote, setSickNote] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (invalidFollowupId) return;
    (api.attendance.myFollowup(followupId) as Promise<FollowupResponse>)
      .then((response) => setFollowup(response.data))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load this absence follow-up.'))
      .finally(() => setLoading(false));
  }, [followupId, invalidFollowupId]);

  async function submitExplanation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!followup || !reason.trim()) {
      setError('Explain why you missed the class.');
      return;
    }
    if (reasonType === 'sick' && !sickNote) {
      setError('Attach a valid sick note when reporting illness.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    const formData = new FormData();
    formData.append('id', String(followup.id));
    formData.append('reason_type', reasonType);
    formData.append('reason', reason.trim());
    if (sickNote) formData.append('sick_note', sickNote);
    try {
      const response = await api.attendance.submitMyFollowup(formData) as { message?: string };
      setNotice(response.message || 'Your absence explanation has been sent to Student Affairs.');
      setFollowup({ ...followup, reason_type: reasonType, student_reason: reason.trim(), sick_note_path: sickNote ? 'attached' : null, response_submitted_at: new Date().toISOString() });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to submit your absence explanation.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 pb-12">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-800">Student affairs</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Missed class follow-up</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Review or purchase the missed session audio if available, or explain your absence to the school.</p>
      </header>

      {(error || invalidFollowupId) && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error || 'This absence follow-up link is invalid.'}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
      {loading && !invalidFollowupId ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading missed session…</div>
      ) : followup ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">{followup.course_name}</h2>
            <p className="mt-1 text-sm text-slate-600">Missed session: {new Date(`${followup.session_date}T12:00:00`).toLocaleDateString()}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="/student/library" className="rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800">Review session audio</a>
              <a href="/student/billing" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Review billing</a>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">Audio availability and purchase options depend on the session resource and your account access.</p>
          </section>

          {followup.response_submitted_at ? (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <h2 className="font-bold text-emerald-900">Your explanation was sent</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-emerald-800">{followup.student_reason}</p>
              {followup.sick_note_path && <p className="mt-2 text-xs font-semibold text-emerald-800">Sick note attached for Student Affairs review.</p>}
            </section>
          ) : (
            <form onSubmit={(event) => void submitExplanation(event)} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Explain your absence</h2>
                <p className="mt-1 text-sm text-slate-600">Your explanation will be sent to Student Affairs for review.</p>
              </div>
              <label className="block text-sm font-semibold text-slate-700">
                Reason
                <select value={reasonType} onChange={(event) => setReasonType(event.target.value as typeof reasonType)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5">
                  <option value="other">Other reason</option>
                  <option value="emergency">Emergency</option>
                  <option value="sick">Illness</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Tell us why you missed this class
                <textarea required maxLength={4000} value={reason} onChange={(event) => setReason(event.target.value)} rows={5} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" />
              </label>
              {reasonType === 'sick' && (
                <label className="block text-sm font-semibold text-slate-700">
                  Valid sick note <span className="text-red-700">(required)</span>
                  <input required type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setSickNote(event.target.files?.[0] ?? null)} className="mt-1.5 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                  <span className="mt-1 block text-xs font-normal text-slate-500">PDF, JPG, or PNG, up to 8 MB.</span>
                </label>
              )}
              <button type="submit" disabled={saving || followup.status === 'completed'} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
                {saving ? 'Sending explanation…' : 'Send explanation'}
              </button>
              {followup.status === 'completed' && <p className="text-xs text-slate-500">This follow-up has been closed by Student Affairs.</p>}
            </form>
          )}
        </>
      ) : null}
    </main>
  );
}
