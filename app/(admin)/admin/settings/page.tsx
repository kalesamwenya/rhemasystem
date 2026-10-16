'use client';

import { useEffect, useState } from 'react';
import { Bell, CalendarRange, Database, GraduationCap, Save, ShieldCheck, Wallet } from 'lucide-react';
import { api } from '@/lib/api';

type TermDates = {
  name?: string;
  start: string;
  end: string;
};

type CohortFeePlan = {
  term: string;
  tuition: number;
  missedExam: number;
  missedQuiz: number;
  missedAssignment: number;
  audioRecording: number;
};

type SettingsState = {
  cohorts: Record<string, string>;
  terms: Record<string, TermDates>;
  cohortPricing: Record<string, CohortFeePlan>;
  assessmentPricing: {
    missedExam: number;
    missedQuiz: number;
    missedAssignment: number;
    audioRecording: number;
  };
};

const defaultTerms: Record<string, TermDates> = {
  '1': { name: 'Term 1', start: '', end: '' },
  '2': { name: 'Term 2', start: '', end: '' },
  '3': { name: 'Term 3', start: '', end: '' },
  '4': { name: 'Term 4', start: '', end: '' },
};

const defaultCohorts: Record<string, string> = {
  '1': 'FYM',
  '2': 'FYE',
  '3': 'SYM',
  '4': 'SYE',
};

const defaultPricing: SettingsState['cohortPricing'] = {
  FYM: { term: 'Term 1', tuition: 0, missedExam: 30, missedQuiz: 15, missedAssignment: 10, audioRecording: 20 },
  FYE: { term: 'Term 1', tuition: 0, missedExam: 30, missedQuiz: 15, missedAssignment: 10, audioRecording: 20 },
  SYM: { term: 'Term 1', tuition: 0, missedExam: 30, missedQuiz: 15, missedAssignment: 10, audioRecording: 20 },
  SYE: { term: 'Term 1', tuition: 0, missedExam: 30, missedQuiz: 15, missedAssignment: 10, audioRecording: 20 },
};

const defaultAssessmentPricing: SettingsState['assessmentPricing'] = {
  missedExam: 30,
  missedQuiz: 15,
  missedAssignment: 10,
  audioRecording: 20,
};

const initialState: SettingsState = {
  cohorts: defaultCohorts,
  terms: defaultTerms,
  cohortPricing: defaultPricing,
  assessmentPricing: defaultAssessmentPricing,
};

function normalizeTerms(input: Record<string, Partial<TermDates>> | undefined): Record<string, TermDates> {
  const next: Record<string, TermDates> = {};
  Object.entries(defaultTerms).forEach(([key, value]) => {
    const current = input?.[key] ?? input?.[String(Number(key) - 1)] ?? {};
    next[key] = {
      name: current.name || value.name,
      start: current.start || '',
      end: current.end || '',
    };
  });
  return next;
}

function normalizePricing(input: Record<string, Partial<CohortFeePlan>> | undefined): SettingsState['cohortPricing'] {
  const next: SettingsState['cohortPricing'] = {};
  Object.entries(defaultPricing).forEach(([cohort, value]) => {
    const source = input?.[cohort] ?? {};
    next[cohort] = {
      term: source.term || value.term,
      tuition: Number(source.tuition ?? value.tuition ?? 0),
      missedExam: Number(source.missedExam ?? value.missedExam ?? 0),
      missedQuiz: Number(source.missedQuiz ?? value.missedQuiz ?? 0),
      missedAssignment: Number(source.missedAssignment ?? value.missedAssignment ?? 0),
      audioRecording: Number(source.audioRecording ?? value.audioRecording ?? 0),
    };
  });
  return next;
}

export default function SettingsHub() {
  const [activeTab, setActiveTab] = useState('Academic');
  const [settings, setSettings] = useState<SettingsState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const navItems = [
    { name: 'Academic', icon: GraduationCap },
    { name: 'Finance', icon: Wallet },
    { name: 'Alerts', icon: Bell },
    { name: 'System', icon: Database },
  ];

  useEffect(() => {
    const load = async () => {
      try {
        const body = await api.config.get() as { data?: Partial<SettingsState> };
        const data = body?.data ?? {};
        setSettings({
          cohorts: data.cohorts ?? defaultCohorts,
          terms: normalizeTerms(data.terms),
          cohortPricing: normalizePricing(data.cohortPricing),
          assessmentPricing: {
            missedExam: Number(data.assessmentPricing?.missedExam ?? defaultAssessmentPricing.missedExam),
            missedQuiz: Number(data.assessmentPricing?.missedQuiz ?? defaultAssessmentPricing.missedQuiz),
            missedAssignment: Number(data.assessmentPricing?.missedAssignment ?? defaultAssessmentPricing.missedAssignment),
            audioRecording: Number(data.assessmentPricing?.audioRecording ?? defaultAssessmentPricing.audioRecording),
          },
        });
      } catch {
        setMessage('Using the default school terms and pricing matrix.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const setTermValue = (termId: string, field: 'start' | 'end', value: string) => {
    setSettings((current) => ({
      ...current,
      terms: {
        ...current.terms,
        [termId]: { ...current.terms[termId], [field]: value },
      },
    }));
  };

  const setCohortFee = (cohortName: string, field: keyof CohortFeePlan, value: string) => {
    setSettings((current) => ({
      ...current,
      cohortPricing: {
        ...current.cohortPricing,
        [cohortName]: {
          ...current.cohortPricing[cohortName],
          [field]: field === 'term' ? value : Number(value || 0),
        },
      },
    }));
  };

  const setAssessmentFee = (field: keyof SettingsState['assessmentPricing'], value: string) => {
    setSettings((current) => ({
      ...current,
      assessmentPricing: {
        ...current.assessmentPricing,
        [field]: Number(value || 0),
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');

    try {
      await api.config.save({
          cohorts: settings.cohorts,
          terms: settings.terms,
          cohortPricing: settings.cohortPricing,
          assessmentPricing: settings.assessmentPricing,
      });
      setMessage('School terms and cohort pricing were saved successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save configurations.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderAcademic = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><CalendarRange className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Academic calendar</p>
            <h3 className="text-lg font-black text-slate-900">School terms</h3>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(settings.terms).map(([termId, term]) => (
            <div key={termId} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{term.name || `Term ${termId}`}</p>
              <div className="mt-3 space-y-3">
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  Start date
                  <input
                    type="date"
                    value={term.start}
                    onChange={(event) => setTermValue(termId, 'start', event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                  />
                </label>
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  End date
                  <input
                    type="date"
                    value={term.end}
                    onChange={(event) => setTermValue(termId, 'end', event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><ShieldCheck className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cohort setup</p>
            <h3 className="text-lg font-black text-slate-900">Academic cohort names</h3>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(settings.cohorts ?? settings.cohorts).map(([id, name]) => (
            <label key={id} className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
              Cohort {id}
              <input
                value={name}
                onChange={(event) => setSettings((current) => ({
                  ...current,
                  cohorts: { ...current.cohorts, [id]: event.target.value.toUpperCase() },
                }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFinance = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Wallet className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pricing matrix</p>
            <h3 className="text-lg font-black text-slate-900">Cohort fee structure</h3>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(settings.cohortPricing).map(([cohort, values]) => (
            <div key={cohort} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="text-sm font-black text-slate-900">{cohort}</h4>
                <select
                  value={values.term}
                  onChange={(event) => setCohortFee(cohort, 'term', event.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700"
                >
                  {Object.values(settings.terms).map((term) => (
                    <option key={term.name} value={term.name}>{term.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <InputField label="Tuition" value={String(values.tuition)} onChange={(value) => setCohortFee(cohort, 'tuition', value)} />
                <InputField label="Exam" value={String(values.missedExam)} onChange={(value) => setCohortFee(cohort, 'missedExam', value)} />
                <InputField label="Quiz" value={String(values.missedQuiz)} onChange={(value) => setCohortFee(cohort, 'missedQuiz', value)} />
                <InputField label="Assignment" value={String(values.missedAssignment)} onChange={(value) => setCohortFee(cohort, 'missedAssignment', value)} />
                <InputField label="Audio" value={String(values.audioRecording)} onChange={(value) => setCohortFee(cohort, 'audioRecording', value)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Database className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Default fees</p>
            <h3 className="text-lg font-black text-slate-900">Missed assessment charges</h3>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InputField label="Missed exam" value={String(settings.assessmentPricing.missedExam)} onChange={(value) => setAssessmentFee('missedExam', value)} />
          <InputField label="Missed quiz" value={String(settings.assessmentPricing.missedQuiz)} onChange={(value) => setAssessmentFee('missedQuiz', value)} />
          <InputField label="Missed assignment" value={String(settings.assessmentPricing.missedAssignment)} onChange={(value) => setAssessmentFee('missedAssignment', value)} />
          <InputField label="Audio recording" value={String(settings.assessmentPricing.audioRecording)} onChange={(value) => setAssessmentFee('audioRecording', value)} />
        </div>
      </div>
    </div>
  );

  const renderAlerts = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Alert policy</p>
        <p className="mt-2 text-sm font-semibold text-amber-900">Students with attendance below 75% automatically receive academic follow-up alerts, and a missed assessment fee reminder is posted when required content is accessed.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Alert channels</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {['SMS', 'WhatsApp', 'Email'].map((channel) => (
            <div key={channel} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">{channel}</div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSystem = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Registry status</p>
        <p className="mt-3 text-sm font-semibold text-slate-700">The schedule store, attendance logs, and audio pricing metadata are synced to the school config file and importable into the reporting dashboard.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">School system</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Configuration & billing</h1>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" />
          {isSaving ? 'Saving...' : 'Save settings'}
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => setActiveTab(item.name)}
              className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-xs font-bold ${
                activeTab === item.name ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2"><item.icon className="h-4 w-4" /> {item.name}</span>
            </button>
          ))}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          {isLoading ? <p className="text-sm text-slate-500">Loading school settings...</p> : (
            <>
              {activeTab === 'Academic' && renderAcademic()}
              {activeTab === 'Finance' && renderFinance()}
              {activeTab === 'Alerts' && renderAlerts()}
              {activeTab === 'System' && renderSystem()}
            </>
          )}
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
          {message}
        </div>
      )}
    </div>
  );
}

function InputField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
      {label}
      <input
        type="number"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
      />
    </label>
  );
}