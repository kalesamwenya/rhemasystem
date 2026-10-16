'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Camera, CheckCircle2, ClipboardList, Download, FileImage, FileUp, Loader2, Plus, RefreshCw, Search, ScanText, Trash2, Upload, X } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { BrowserMultiFormatReader } from '@zxing/browser';

type Student = { student_id: string; name: string; class: string; email?: string | null };
type Term = { term_id: number; start_date: string; end_date: string };
type ServiceHour = {
  id: number; student_id: string; name: string; cohort: string; term_id: number; stamp_date: string;
  service_date?: string; hours: number; ministry: string; supervisor: string; comments?: string; source: string;
};
type Entry = {
  student_id: string; cohort: string; term_id: string; stamp_date: string; service_date: string;
  hours: string; ministry: string; supervisor: string; comments: string;
};
type Activity = { ministry: string; hours: string };

const emptyEntry: Entry = { student_id: '', cohort: '', term_id: '', stamp_date: '', service_date: '', hours: '', ministry: '', supervisor: '', comments: '' };
const csvHeaders = 'student_id,cohort,term_id,stamp_date,service_date,hours,ministry,supervisor,comments';

function formatDate(value: string) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString() : '-';
}

async function prepareOcrImage(file: File): Promise<HTMLCanvasElement> {
  const image = new Image();
  image.src = URL.createObjectURL(file);
  await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Unable to prepare image for OCR.')); });
  const scale = Math.max(1.5, Math.min(2.5, 2200 / Math.max(image.naturalWidth, image.naturalHeight)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image processing is unavailable in this browser.');
  context.filter = 'grayscale(1) contrast(1.25) brightness(1.05)';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(image.src);
  return canvas;
}

export default function ServiceHoursPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [records, setRecords] = useState<ServiceHour[]>([]);
  const [entry, setEntry] = useState<Entry>(emptyEntry);
  const [bulkText, setBulkText] = useState('');
  const [tab, setTab] = useState<'capture' | 'bulk' | 'reports'>('capture');
  const [filters, setFilters] = useState({ term_id: '', cohort: '', search: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [reviewImage, setReviewImage] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewEntry, setReviewEntry] = useState<Entry>(emptyEntry);
  const [activities, setActivities] = useState<Activity[]>([{ ministry: '', hours: '' }]);
  const [reviewActivities, setReviewActivities] = useState<Activity[]>([{ ministry: '', hours: '' }]);
  const [scannedFormReady, setScannedFormReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const load = async () => {
    try {
      const [studentResponse, termResponse, hourResponse] = await Promise.all([api.students.adminRoster(), api.terms.list(), api.serviceHours.list()]) as [
        { data?: Student[] }, { data?: Term[] }, { data?: ServiceHour[] }
      ];
      const loadedStudents = studentResponse.data || [];
      const loadedTerms = termResponse.data || [];
      setStudents(loadedStudents);
      setTerms(loadedTerms);
      setRecords(hourResponse.data || []);
      if (!entry.term_id && loadedTerms[0]) setEntry((current) => ({ ...current, term_id: String(loadedTerms[0].term_id) }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load service-hour data.');
    }
  };

  useEffect(() => { load(); return () => streamRef.current?.getTracks().forEach((track) => track.stop()); }, []);

  useEffect(() => {
    if (!scanning || !videoRef.current) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    let detector: { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } | undefined;
    const start = async () => {
      const Detector = (window as Window & { BarcodeDetector?: new () => typeof detector }).BarcodeDetector;
      if (!Detector) { setError('Barcode scanning is not supported by this browser. Enter the student ID manually.'); setScanning(false); return; }
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        videoRef.current!.srcObject = streamRef.current;
        await videoRef.current!.play();
        detector = new Detector();
        timer = setInterval(async () => {
          if (!detector || !videoRef.current) return;
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) {
            setEntry((current) => ({ ...current, student_id: codes[0].rawValue.trim() }));
            setMessage(`Scanned student ID ${codes[0].rawValue.trim()}.`);
            setScanning(false);
          }
        }, 500);
      } catch { setError('Camera access was unavailable. Enter the student ID manually.'); setScanning(false); }
    };
    start();
    return () => { if (timer) clearInterval(timer); streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; };
  }, [scanning]);

  const selectedStudent = students.find((student) => student.student_id === entry.student_id);
  const reviewStudent = students.find((student) => student.student_id === reviewEntry.student_id);
  const filteredRecords = useMemo(() => records.filter((record) => {
    const matchesTerm = !filters.term_id || String(record.term_id) === filters.term_id;
    const matchesCohort = !filters.cohort || record.cohort === filters.cohort;
    const query = filters.search.toLowerCase();
    return matchesTerm && matchesCohort && (!query || record.student_id.toLowerCase().includes(query) || record.name.toLowerCase().includes(query));
  }), [records, filters]);
  const totalHours = filteredRecords.reduce((sum, record) => sum + Number(record.hours), 0);
  const cohorts = Array.from(new Set(students.map((student) => student.class))).sort();

  const save = async (payload: Record<string, unknown> | Record<string, unknown>[]) => {
    setError(''); setMessage('');
    try { await api.serviceHours.save(Array.isArray(payload) ? { records: payload } : payload); setMessage('Service hours saved and verified.'); await load(); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save service hours.'); }
  };

  const saveSingle = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!scannedFormReady) { setError('Upload and scan the completed form before saving.'); return; }
    if (!selectedStudent) { setError('Choose a valid student ID from the student register.'); return; }
    if (!entry.cohort) { setError('Select the checked Year of study from the form.'); return; }
    if (entry.cohort !== selectedStudent.class) { setError(`Year of study does not match the student register. This student is in ${selectedStudent.class}.`); return; }
    const validActivities = activities.filter((activity) => activity.ministry.trim() && Number(activity.hours) > 0);
    if (!validActivities.length) { setError('Add at least one activity with hours completed.'); return; }
    await save(validActivities.map((activity) => ({ ...entry, ...activity, term_id: Number(entry.term_id), hours: Number(activity.hours), source: 'manual' })));
  };

  const parseOcrDate = (value: string) => {
    const match = value.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
    if (!match) return '';
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  };

  const parseOcrEntry = (text: string): Entry => {
    const normalized = text.replace(/\s+/g, ' ');
    const studentId = normalized.match(/\b\d{4,8}\b/)?.[0] || '';
    const cohort = normalized.match(/\b(FYM|FYE|SYM|SYE)\b/i)?.[1].toUpperCase() || '';
    const dateMatches = [...normalized.matchAll(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/g)].map((match) => parseOcrDate(match[0])).filter(Boolean);
    const hours = normalized.match(/\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i)?.[1] || '';
    const term = terms.find((item) => dateMatches[0] && dateMatches[0] >= item.start_date && dateMatches[0] <= item.end_date);
    const ministryMatch = normalized.match(/(?:ministry|service performed|description of ministry)[:\s-]+(.{3,80}?)(?=\s+(?:date|hours?|supervisor|team leader|$))/i);
    const supervisorMatch = normalized.match(/(?:supervisor|team leader)[:\s-]+(.{3,60}?)(?=\s+(?:tel|phone|email|date|$))/i);
    return { ...emptyEntry, student_id: studentId, cohort, term_id: term ? String(term.term_id) : '', stamp_date: dateMatches[0] || '', service_date: dateMatches[1] || '', hours, ministry: ministryMatch?.[1]?.trim() || '', supervisor: supervisorMatch?.[1]?.trim() || '' };
  };

  const scanDocuments = async (files: File[]) => {
    if (!files.length) return;
    if (files.some((file) => !file.type.startsWith('image/'))) { setError('Upload clear image files for the front and back of the form. PDF OCR is not supported in this browser flow yet.'); return; }
    setError(''); setMessage(''); setOcrBusy(true); setOcrProgress(0);
    const imageUrls = files.map((file) => URL.createObjectURL(file));
    setReviewImages(imageUrls); setReviewImage(imageUrls[0]); setReviewText('');
    try {
      let barcodeStudentId = '';
      const barcodeReader = new BrowserMultiFormatReader();
      for (const imageUrl of imageUrls) {
        try {
          const barcode = await barcodeReader.decodeFromImageUrl(imageUrl);
          const value = barcode.getText().trim();
          if (/^[A-Za-z0-9-]{3,50}$/.test(value)) { barcodeStudentId = value; break; }
        } catch {
          // Some forms do not contain a code; OCR remains the fallback.
        }
      }
      const worker = await createWorker('eng', undefined, { logger: (event) => { if (event.status === 'recognizing text') setOcrProgress(Math.round(event.progress * 100)); } });
      const texts: string[] = [];
      for (const [index, file] of files.entries()) {
        const typedPass = (await worker.recognize(file)).data.text;
        const enhancedPass = (await worker.recognize(await prepareOcrImage(file))).data.text;
        texts.push(`--- SIDE ${index + 1} TYPED / ORIGINAL ---\n${typedPass}\n--- SIDE ${index + 1} HANDWRITING / ENHANCED ---\n${enhancedPass}`);
      }
      await worker.terminate();
      const combinedText = texts.join('\n\n--- SECOND SIDE ---\n\n');
      setReviewText(combinedText);
      const extracted = parseOcrEntry(combinedText);
      if (barcodeStudentId) extracted.student_id = barcodeStudentId;
      setReviewEntry(extracted);
      setReviewActivities([{ ministry: extracted.ministry, hours: extracted.hours }]);
      setMessage('Typed and handwritten text was scanned. Review every extracted value before confirming.');
      setReviewOpen(true);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'Unable to read this image.');
      setReviewImages([]); setReviewImage('');
    } finally { setOcrBusy(false); }
  };

  const confirmScannedEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    const student = students.find((item) => item.student_id === reviewEntry.student_id);
    if (!student) { setError('The scanned student ID is not in the student register. Correct it before confirming.'); return; }
    setEntry({ ...reviewEntry, cohort: student.class });
    setActivities(reviewActivities);
    setScannedFormReady(true);
    setReviewOpen(false);
    setMessage(`Student found: ${student.name}. The scanned data has been placed in the form for final verification.`);
  };

  const parseBulk = () => {
    const lines = bulkText.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) { setError('Paste a header row followed by at least one record.'); return; }
    const header = lines[0].split(',').map((value) => value.trim());
    const indexes = Object.fromEntries(header.map((value, index) => [value, index]));
    const required = ['student_id', 'cohort', 'term_id', 'stamp_date', 'hours', 'ministry'];
    if (required.some((key) => indexes[key] === undefined)) { setError(`Bulk data must include: ${required.join(', ')}.`); return; }
    const rows = lines.slice(1).map((line) => line.split(',').map((value) => value.trim())).map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] || ''])));
    save(rows.map((row) => ({ ...row, hours: Number(row.hours), term_id: Number(row.term_id), source: 'bulk' })));
  };

  const exportReport = () => {
    const body = filteredRecords.map((record) => [record.student_id, record.name, record.cohort, record.term_id, record.stamp_date, record.service_date || '', record.hours, record.ministry, record.supervisor].join(',')).join('\n');
    const blob = new Blob([`student_id,name,cohort,term_id,stamp_date,service_date,hours,ministry,supervisor\n${body}`], { type: 'text/csv' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'church-service-hours.csv'; link.click(); URL.revokeObjectURL(link.href);
  };

  const scannedStudentConfirmation = reviewOpen ? <div className="fixed bottom-5 left-1/2 z-[70] w-[min(92vw,32rem)] -translate-x-1/2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-2xl"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Student found from scanned ID</p><p className="mt-1 text-lg font-black text-slate-900">{reviewStudent?.name || 'Student not found'}</p><p className="text-sm text-slate-700">ID: {reviewStudent?.student_id || reviewEntry.student_id} · Cohort: {reviewStudent?.class || 'Unknown'}</p><p className="text-sm text-slate-700">Email: {reviewStudent?.email || 'No email on student record'}</p></div> : null;
  return <div className="space-y-6 pb-12">
    {scannedStudentConfirmation}
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
      <div><p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">Student affairs</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Church service hours</h1><p className="mt-1 text-sm text-slate-500">Capture, verify, and report ministry service completed by students.</p></div>
      <div className="flex items-center gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-red-800"><FileImage className="h-4 w-4" />Upload front + back<input type="file" accept="image/*" multiple className="sr-only" disabled={ocrBusy} onChange={(event) => { const files = Array.from(event.target.files || []); if (files.length > 2) setError('Select a maximum of two images: the front and back of the form.'); else scanDocuments(files); event.currentTarget.value = ''; }} /></label><Link href="/admin/student-affairs" className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 hover:text-slate-900">Back</Link></div>
    </header>

    {(message || error) && <div className={`flex items-center justify-between rounded-xl border p-4 text-sm font-semibold ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}><span>{error || message}</span><button onClick={() => { setError(''); setMessage(''); }} aria-label="Dismiss message"><X className="h-4 w-4" /></button></div>}

    {ocrBusy && <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800"><Loader2 className="h-4 w-4 animate-spin" />Reading uploaded form{ocrProgress ? `: ${ocrProgress}%` : '...'}</div>}

    {reviewOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={confirmScannedEntry} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Verification required</p><h2 className="mt-1 text-2xl font-black text-slate-900">Review scanned data</h2><p className="mt-1 text-sm text-slate-500">OCR is an assistant, not a final authority. Correct every field before confirming.</p></div><button type="button" onClick={() => setReviewOpen(false)} aria-label="Close scan review"><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]"><div><img src={reviewImage} alt="Uploaded church service form" className="max-h-[55vh] w-full rounded-xl border border-slate-200 object-contain" /><details className="mt-3 rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer text-xs font-black uppercase tracking-wider text-slate-600"><ScanText className="mr-2 inline h-4 w-4" />View extracted text</summary><pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-slate-500">{reviewText}</pre></details></div><div className="grid content-start gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Student ID<input value={reviewEntry.student_id} onChange={(event) => setReviewEntry({ ...reviewEntry, student_id: event.target.value })} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"><span className="text-xs font-bold text-slate-400">Registered student</span><p className="mt-1 font-black text-slate-900">{reviewStudent ? `${reviewStudent.name} · ${reviewStudent.class}` : 'ID requires correction'}</p></div><label className="text-xs font-bold text-slate-600">School term<select value={reviewEntry.term_id} onChange={(event) => setReviewEntry({ ...reviewEntry, term_id: event.target.value })} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">Select term</option>{terms.map((term) => <option key={term.term_id} value={term.term_id}>Term {term.term_id}</option>)}</select></label><label className="text-xs font-bold text-slate-600">Stamp date<input type="date" value={reviewEntry.stamp_date} onChange={(event) => setReviewEntry({ ...reviewEntry, stamp_date: event.target.value })} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="text-xs font-bold text-slate-600">Service date<input type="date" value={reviewEntry.service_date} onChange={(event) => setReviewEntry({ ...reviewEntry, service_date: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="text-xs font-bold text-slate-600">Hours<input type="number" min="0.25" max="24" step="0.25" value={reviewEntry.hours} onChange={(event) => setReviewEntry({ ...reviewEntry, hours: event.target.value })} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="text-xs font-bold text-slate-600 sm:col-span-2">Ministry or service performed<input value={reviewEntry.ministry} onChange={(event) => setReviewEntry({ ...reviewEntry, ministry: event.target.value })} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="text-xs font-bold text-slate-600 sm:col-span-2">Supervisor<input value={reviewEntry.supervisor} onChange={(event) => setReviewEntry({ ...reviewEntry, supervisor: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label><label className="text-xs font-bold text-slate-600 sm:col-span-2">Comments<textarea value={reviewEntry.comments} onChange={(event) => setReviewEntry({ ...reviewEntry, comments: event.target.value })} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label></div></div><div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5"><button type="button" onClick={() => setReviewOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600">Discard</button><button className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white"><CheckCircle2 className="h-4 w-4" />Confirm and save</button></div></form></div>}

    <div className="flex flex-wrap gap-2 border-b border-slate-200"><button onClick={() => setTab('capture')} className={`px-4 py-3 text-xs font-black uppercase tracking-wider ${tab === 'capture' ? 'border-b-2 border-red-600 text-red-700' : 'text-slate-500'}`}><Plus className="mr-2 inline h-4 w-4" />Single capture</button><button onClick={() => setTab('bulk')} className={`px-4 py-3 text-xs font-black uppercase tracking-wider ${tab === 'bulk' ? 'border-b-2 border-red-600 text-red-700' : 'text-slate-500'}`}><Upload className="mr-2 inline h-4 w-4" />Bulk import</button><button onClick={() => setTab('reports')} className={`px-4 py-3 text-xs font-black uppercase tracking-wider ${tab === 'reports' ? 'border-b-2 border-red-600 text-red-700' : 'text-slate-500'}`}><ClipboardList className="mr-2 inline h-4 w-4" />Reports</button></div>

    {tab === 'capture' && <form onSubmit={saveSingle} className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
      <div className="md:col-span-2 flex items-center justify-between"><div><h2 className="text-xl font-black text-slate-900">Review scanned form</h2><p className="text-xs text-slate-500">Upload the completed front and back. The form supplies the service data; student ID is optional for correcting the scan.</p></div><button type="button" onClick={() => setScanning((current) => !current)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white"><Camera className="h-4 w-4" />{scanning ? 'Stop scanner' : 'Scan ID'}</button></div>
      {scanning && <div className="md:col-span-2 overflow-hidden rounded-xl bg-slate-950"><video ref={videoRef} className="mx-auto max-h-64 w-full object-contain" muted playsInline /></div>}
      <label className="text-xs font-bold text-slate-600">Student ID (optional correction)<input value={entry.student_id} onChange={(event) => { setEntry({ ...entry, student_id: event.target.value }); setScannedFormReady(false); }} list="student-ids" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Only enter if OCR misses the ID" /><datalist id="student-ids">{students.map((student) => <option key={student.student_id} value={student.student_id}>{student.name} ({student.class})</option>)}</datalist></label>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"><span className="text-xs font-bold text-slate-400">Registered student</span><p className="mt-1 font-black text-slate-900">{selectedStudent ? `${selectedStudent.name} · ${selectedStudent.class}` : 'Enter a valid student ID'}</p></div>
      <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-slate-700">Captured student identity</p><p className="mt-1 text-sm font-black text-slate-900">{selectedStudent ? `${selectedStudent.name} · ${selectedStudent.class}` : 'Waiting for the scanned form'}</p><p className="mt-1 text-xs text-slate-500">Year of study is taken from the captured form and checked against the student register.</p></div>
      <label className="text-xs font-bold text-slate-600">School term<select value={entry.term_id} onChange={(event) => setEntry({ ...entry, term_id: event.target.value })} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">Select term</option>{terms.map((term) => <option key={term.term_id} value={term.term_id}>Term {term.term_id} · {formatDate(term.start_date)} to {formatDate(term.end_date)}</option>)}</select></label>
      <label className="text-xs font-bold text-slate-600">Date on church stamp<input type="date" value={entry.stamp_date} onChange={(event) => setEntry({ ...entry, stamp_date: event.target.value })} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
      <label className="text-xs font-bold text-slate-600">Service date<input type="date" value={entry.service_date} onChange={(event) => setEntry({ ...entry, service_date: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
      <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-slate-700">Activities and hours</p><p className="mt-1 text-xs text-slate-500">Add every activity listed on the front and back of the form.</p></div><button type="button" onClick={() => setActivities([...activities, { ministry: '', hours: '' }])} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700">+ Add activity</button></div><div className="mt-3 space-y-3">{activities.map((activity, index) => <div key={index} className="flex flex-col gap-2 sm:flex-row"><input value={activity.ministry} onChange={(event) => setActivities(activities.map((item, itemIndex) => itemIndex === index ? { ...item, ministry: event.target.value } : item))} required className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" placeholder={`Activity ${index + 1}, e.g. Children ministry`} /><input type="number" min="0.25" max="24" step="0.25" value={activity.hours} onChange={(event) => setActivities(activities.map((item, itemIndex) => itemIndex === index ? { ...item, hours: event.target.value } : item))} required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm sm:w-32" placeholder="Hours" />{activities.length > 1 && <button type="button" onClick={() => setActivities(activities.filter((_, itemIndex) => itemIndex !== index))} className="rounded-xl border border-red-200 px-3 text-red-600" aria-label={`Remove activity ${index + 1}`}><X className="h-4 w-4" /></button>}</div>)}</div></div>
      <label className="text-xs font-bold text-slate-600">Supervisor name<input value={entry.supervisor} onChange={(event) => setEntry({ ...entry, supervisor: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
      <label className="text-xs font-bold text-slate-600 md:col-span-2">Comments<textarea value={entry.comments} onChange={(event) => setEntry({ ...entry, comments: event.target.value })} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
      <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-red-800 md:col-span-2"><CheckCircle2 className="h-4 w-4" />Save verified hours</button>
    </form>}

    {tab === 'bulk' && <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-black text-slate-900">Bulk import</h2><p className="mt-1 text-sm text-slate-500">Paste CSV data. Every row receives the same student, cohort, term, and stamp-date validation.</p></div><button onClick={() => setBulkText(csvHeaders + '\n')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-wider text-slate-700"><Download className="h-4 w-4" />Use template</button></div><textarea value={bulkText} onChange={(event) => setBulkText(event.target.value)} rows={12} className="mt-5 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs" placeholder={csvHeaders} /><button onClick={parseBulk} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-wider text-white"><FileUp className="h-4 w-4" />Validate and import rows</button></section>}

    {tab === 'reports' && <section className="space-y-5"><div className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Records</p><p className="mt-2 text-3xl font-black text-slate-900">{filteredRecords.length}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Total hours</p><p className="mt-2 text-3xl font-black text-slate-900">{totalHours.toFixed(2)}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Students served</p><p className="mt-2 text-3xl font-black text-slate-900">{new Set(filteredRecords.map((record) => record.student_id)).size}</p></div></div><div className="flex flex-wrap items-center gap-3"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} className="rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm" placeholder="Search ID or name" /></div><select value={filters.term_id} onChange={(event) => setFilters({ ...filters, term_id: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">All terms</option>{terms.map((term) => <option key={term.term_id} value={term.term_id}>Term {term.term_id}</option>)}</select><select value={filters.cohort} onChange={(event) => setFilters({ ...filters, cohort: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">All cohorts</option>{cohorts.map((cohort) => <option key={cohort}>{cohort}</option>)}</select><button onClick={exportReport} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-white"><Download className="h-4 w-4" />Export CSV</button><button onClick={load} className="rounded-xl border border-slate-200 p-2.5" aria-label="Refresh report"><RefreshCw className="h-4 w-4" /></button></div><div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500"><tr>{['Student', 'Cohort', 'Term', 'Stamp date', 'Service date', 'Hours', 'Ministry', 'Supervisor', ''].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredRecords.map((record) => <tr key={record.id}><td className="whitespace-nowrap px-4 py-3"><p className="font-black text-slate-900">{record.name}</p><p className="text-xs text-slate-500">{record.student_id}</p></td><td className="px-4 py-3 font-semibold">{record.cohort}</td><td className="px-4 py-3">Term {record.term_id}</td><td className="whitespace-nowrap px-4 py-3">{formatDate(record.stamp_date)}</td><td className="whitespace-nowrap px-4 py-3">{formatDate(record.service_date || '')}</td><td className="px-4 py-3 font-black">{Number(record.hours).toFixed(2)}</td><td className="px-4 py-3">{record.ministry}</td><td className="px-4 py-3">{record.supervisor || '-'}</td><td className="px-4 py-3"><button onClick={async () => { if (window.confirm('Delete this service-hour record?')) { await api.serviceHours.remove(record.id); load(); } }} aria-label="Delete service-hour record" className="text-red-600"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table>{!filteredRecords.length && <p className="p-10 text-center text-sm text-slate-500">No service-hour records match these filters.</p>}</div></section>}
  </div>;
}