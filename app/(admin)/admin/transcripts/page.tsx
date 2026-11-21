'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Printer, Search } from 'lucide-react';
import { api } from '@/lib/api';

type TranscriptRecord = {
  student_id: string;
  serial_number: string;
  generated_at: string;
  name: string;
  class: string;
};

type TranscriptResponse = {
  data?: TranscriptRecord[];
  message?: string;
};

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function TranscriptsPage() {
  const [transcripts, setTranscripts] = useState<TranscriptRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [openingStudentId, setOpeningStudentId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (api.students.adminTranscripts() as Promise<TranscriptResponse>)
      .then((response) => {
        if (!Array.isArray(response.data)) throw new Error(response.message ?? 'Stored transcripts were not returned.');
        if (active) setTranscripts(response.data);
      })
      .catch((cause: unknown) => {
        if (active) setError(messageOf(cause, 'Unable to load stored transcripts.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const visibleTranscripts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return transcripts.filter((transcript) =>
      !term || `${transcript.name} ${transcript.student_id} ${transcript.class} ${transcript.serial_number}`.toLowerCase().includes(term),
    );
  }, [search, transcripts]);

  const openTranscript = async (transcript: TranscriptRecord) => {
    const preview = window.open(api.students.adminTranscriptPdfUrl(transcript.student_id), '_blank');
    if (!preview) {
      setError('Allow pop-ups to open the transcript PDF.');
      return;
    }

    setOpeningStudentId(transcript.student_id);
    setError('');
    setOpeningStudentId('');
  };

  return (
    <main className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">Restricted academic records</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Official transcripts</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          Open and print stored transcript PDFs. Access is limited to authorized Academics, Student Affairs, and Media/IT administrators.
        </p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <label className="relative block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by student name, ID, cohort, or serial"
          aria-label="Search transcripts"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-700"
        />
      </label>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />Loading transcript register…
        </div>
      ) : visibleTranscripts.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {transcripts.length === 0 ? 'No stored transcript PDFs are available.' : 'No transcripts match your search.'}
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="p-4">Student</th><th className="p-4">Cohort</th><th className="p-4">Transcript serial</th><th className="p-4">Generated</th><th className="p-4"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleTranscripts.map((transcript) => (
                  <tr key={transcript.student_id}>
                    <td className="p-4">
                      <p className="font-semibold text-slate-800">{transcript.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{transcript.student_id}</p>
                    </td>
                    <td className="p-4 text-slate-600">{transcript.class || '—'}</td>
                    <td className="p-4 font-mono text-xs text-slate-700">{transcript.serial_number}</td>
                    <td className="p-4 text-slate-600">{new Date(transcript.generated_at).toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => void openTranscript(transcript)}
                        disabled={openingStudentId !== ''}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-900 hover:bg-blue-50 disabled:opacity-50"
                      >
                        {openingStudentId === transcript.student_id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Printer className="h-4 w-4" />}
                        Open / print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
