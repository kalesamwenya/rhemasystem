'use client';

import { useEffect, useState } from 'react';
import { Bell, CalendarRange, CheckCircle2, CreditCard, Database, GraduationCap, Save, ShieldCheck, Wallet, XCircle } from 'lucide-react';
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
  admissions: {
    enrollmentOpen: boolean;
    applicationFeeRequired: boolean;
    applicationFeeAmount: number;
    applicationYears: number[];
  };
  cohorts: Record<string, string>;
  terms: Record<string, TermDates>;
  cohortPricing: Record<string, CohortFeePlan>;
  assessmentPricing: {
    missedExam: number;
    missedQuiz: number;
    missedAssignment: number;
    audioRecording: number;
  };
  paymentGateway: {
    provider: 'flutterwave';
    currency: string;
    secretKeyConfigured: boolean;
    publicKeyConfigured: boolean;
    credentialsMatch: boolean;
    mode: 'test' | 'live' | 'unconfigured' | 'mismatched';
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
  admissions: {
    enrollmentOpen: false,
    applicationFeeRequired: false,
    applicationFeeAmount: 0,
    applicationYears: [2026, 2027, 2028],
  },
  cohorts: defaultCohorts,
  terms: defaultTerms,
  cohortPricing: defaultPricing,
  assessmentPricing: defaultAssessmentPricing,
  paymentGateway: {
    provider: 'flutterwave',
    currency: 'ZMW',
    secretKeyConfigured: false,
    publicKeyConfigured: false,
    credentialsMatch: false,
    mode: 'unconfigured',
  },
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

function normalizeCohorts(input: Record<string, unknown> | undefined): Record<string, string> {
  return Object.fromEntries(Object.entries(defaultCohorts).map(([id, fallback]) => {
    const value = input?.[id];
    return [id, typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : fallback];
  }));
}

function normalizePricing(
  input: Record<string, Partial<CohortFeePlan>> | undefined,
  cohorts: Record<string, string> = defaultCohorts,
): SettingsState['cohortPricing'] {
  const next: SettingsState['cohortPricing'] = {};
  const cohortNames = new Set([...Object.keys(defaultPricing), ...Object.keys(input ?? {}), ...Object.values(cohorts)]);
  cohortNames.forEach((cohort) => {
    const cohortId = Object.entries(cohorts).find(([, name]) => name.toUpperCase() === cohort.toUpperCase())?.[0];
    const fallback = defaultPricing[cohort] ?? defaultPricing[defaultCohorts[cohortId ?? '1']] ?? defaultPricing.FYM;
    const source = input?.[cohort] ?? {};
    next[cohort] = {
      term: source.term || fallback.term,
      tuition: Number(source.tuition ?? fallback.tuition ?? 0),
      missedExam: Number(source.missedExam ?? fallback.missedExam ?? 0),
      missedQuiz: Number(source.missedQuiz ?? fallback.missedQuiz ?? 0),
      missedAssignment: Number(source.missedAssignment ?? fallback.missedAssignment ?? 0),
      audioRecording: Number(source.audioRecording ?? fallback.audioRecording ?? 0),
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
  const [messageIsError, setMessageIsError] = useState(false);

  const navItems = [
    { name: 'Admissions', icon: GraduationCap },
    { name: 'Academic', icon: GraduationCap },
    { name: 'Finance', icon: Wallet },
    { name: 'Payments', icon: CreditCard },
    { name: 'Alerts', icon: Bell },
    { name: 'System', icon: Database },
  ];

  useEffect(() => {
    const load = async () => {
      try {
        const body = await api.config.get() as { data?: Partial<SettingsState> };
        const data = body?.data ?? {};
        const cohorts = normalizeCohorts(data.cohorts);
        setSettings({
          admissions: {
            enrollmentOpen: data.admissions?.enrollmentOpen === true,
            applicationFeeRequired: data.admissions?.applicationFeeRequired === true,
            applicationFeeAmount: Number(data.admissions?.applicationFeeAmount ?? 0),
            applicationYears: Array.isArray(data.admissions?.applicationYears)
              ? Array.from(new Set(data.admissions.applicationYears
                .map(Number)
                .filter((year) => Number.isInteger(year) && year >= 2000 && year <= 2100)))
                .sort((left, right) => left - right)
              : [2026, 2027, 2028],
          },
          cohorts,
          terms: normalizeTerms(data.terms),
          cohortPricing: normalizePricing(data.cohortPricing, cohorts),
          assessmentPricing: {
            missedExam: Number(data.assessmentPricing?.missedExam ?? defaultAssessmentPricing.missedExam),
            missedQuiz: Number(data.assessmentPricing?.missedQuiz ?? defaultAssessmentPricing.missedQuiz),
            missedAssignment: Number(data.assessmentPricing?.missedAssignment ?? defaultAssessmentPricing.missedAssignment),
            audioRecording: Number(data.assessmentPricing?.audioRecording ?? defaultAssessmentPricing.audioRecording),
          },
          paymentGateway: {
            provider: 'flutterwave',
            currency: data.paymentGateway?.currency ?? 'ZMW',
            secretKeyConfigured: data.paymentGateway?.secretKeyConfigured ?? false,
            publicKeyConfigured: data.paymentGateway?.publicKeyConfigured ?? false,
            credentialsMatch: data.paymentGateway?.credentialsMatch ?? false,
            mode: data.paymentGateway?.mode ?? 'unconfigured',
          },
        });
      } catch (error) {
        setMessageIsError(true);
        setMessage(error instanceof Error ? error.message : 'Unable to load school settings.');
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

  const setCohortName = (cohortId: string, value: string) => {
    const nextName = value.trim().toUpperCase();
    setSettings((current) => {
      const previousName = current.cohorts[cohortId]?.trim().toUpperCase();
      const nextPricing = { ...current.cohortPricing };
      if (nextName && previousName && !nextPricing[nextName] && nextPricing[previousName]) {
        nextPricing[nextName] = { ...nextPricing[previousName] };
      }
      return {
        ...current,
        cohorts: { ...current.cohorts, [cohortId]: nextName },
        cohortPricing: nextPricing,
      };
    });
  };

  const setAssessmentFee = (field: keyof SettingsState['assessmentPricing'], value: string) => {
    const amount = Number(value || 0);
    const cohortField: keyof CohortFeePlan = field === 'missedExam'
      ? 'missedExam'
      : field === 'missedQuiz'
        ? 'missedQuiz'
        : field === 'missedAssignment'
          ? 'missedAssignment'
          : 'audioRecording';
    setSettings((current) => ({
      ...current,
      cohortPricing: Object.fromEntries(Object.entries(current.cohortPricing).map(([cohort, pricing]) => [
        cohort,
        Number(pricing[cohortField]) === current.assessmentPricing[field]
          ? { ...pricing, [cohortField]: amount }
          : pricing,
      ])),
      assessmentPricing: {
        ...current.assessmentPricing,
        [field]: amount,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessageIsError(false);
    setMessage('');

    try {
      await api.config.save({
          admissions: settings.admissions,
          cohorts: settings.cohorts,
          terms: settings.terms,
          cohortPricing: settings.cohortPricing,
          assessmentPricing: settings.assessmentPricing,
          paymentGateway: {
            provider: 'flutterwave',
            currency: settings.paymentGateway.currency,
          },
      });
      setMessage('School settings were saved successfully.');
    } catch (error) {
      setMessageIsError(true);
      setMessage(error instanceof Error ? error.message : 'Unable to save configurations.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderAdmissions = () => (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Enrollment availability</p>
          <h3 className="mt-1 text-lg font-black text-slate-900">Application form</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            When enrollment is closed, applicants cannot start or submit an application. The admissions page will show a notice that enrollment is not open.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${settings.admissions.enrollmentOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
          {settings.admissions.enrollmentOpen ? 'Applications open' : 'Applications closed'}
        </span>
      </div>
      <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <input
          type="checkbox"
          checked={settings.admissions.enrollmentOpen}
          onChange={(event) => setSettings((current) => ({
            ...current,
            admissions: { ...current.admissions, enrollmentOpen: event.target.checked },
          }))}
          className="h-4 w-4 accent-emerald-700"
        />
        <span className="text-sm font-bold text-slate-800">Open applications for enrollment</span>
      </label>
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black text-slate-900">Application fee</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">Choose whether an application fee is charged. Applicants pay enabled fees online through Flutterwave.</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <input
              type="checkbox"
              checked={settings.admissions.applicationFeeRequired}
              onChange={(event) => setSettings((current) => ({
                ...current,
                admissions: { ...current.admissions, applicationFeeRequired: event.target.checked },
              }))}
              className="h-4 w-4 accent-emerald-700"
            />
            Charge application fee
          </label>
        </div>
        {settings.admissions.applicationFeeRequired && (
          <label className="mt-4 block max-w-sm text-xs font-bold uppercase tracking-wide text-slate-500">
            Fee amount ({settings.paymentGateway.currency})
            <input
              type="number"
              min="0.01"
              max="99999999.99"
              step="0.01"
              required
              value={settings.admissions.applicationFeeAmount || ''}
              onChange={(event) => setSettings((current) => ({
                ...current,
                admissions: { ...current.admissions, applicationFeeAmount: Number(event.target.value) },
              }))}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400"
            />
          </label>
        )}
      </div>
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-900">Application years</p>
            <p className="mt-1 text-xs text-slate-600">These are the years applicants can select on the form.</p>
          </div>
          <button
            type="button"
            onClick={() => setSettings((current) => {
              const nextYear = Math.max(new Date().getFullYear(), ...current.admissions.applicationYears) + 1;
              if (nextYear > 2100) return current;
              return {
                ...current,
                admissions: { ...current.admissions, applicationYears: [...current.admissions.applicationYears, nextYear].sort((left, right) => left - right) },
              };
            })}
            disabled={settings.admissions.applicationYears.length >= 10 || Math.max(new Date().getFullYear(), ...settings.admissions.applicationYears) >= 2100}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Add year
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {settings.admissions.applicationYears.map((year, index) => (
            <label key={`${year}-${index}`} className="text-xs font-bold text-slate-600">
              Year {index + 1}
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={year}
                  onChange={(event) => {
                    const nextYear = Number(event.target.value);
                    setSettings((current) => ({
                      ...current,
                      admissions: {
                        ...current.admissions,
                        applicationYears: current.admissions.applicationYears.map((item, itemIndex) => itemIndex === index ? nextYear : item),
                      },
                    }));
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                />
                <button
                  type="button"
                  aria-label={`Remove application year ${year}`}
                  disabled={settings.admissions.applicationYears.length <= 1}
                  onClick={() => setSettings((current) => ({
                    ...current,
                    admissions: {
                      ...current.admissions,
                      applicationYears: current.admissions.applicationYears.filter((_, itemIndex) => itemIndex !== index),
                    },
                  }))}
                  className="rounded-lg border border-slate-200 px-3 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </label>
          ))}
        </div>
      </div>
    </section>
  );

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
          {Object.entries(settings.cohorts).map(([id, name]) => (
            <label key={id} className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
              Cohort {id}
              <input
                value={name}
                onChange={(event) => setCohortName(id, event.target.value)}
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
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cohort pricing overrides</p>
            <h3 className="text-lg font-black text-slate-900">Cohort fee structure</h3>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(settings.cohortPricing)
            .filter(([cohort]) => Object.values(settings.cohorts).some((name) => name.toUpperCase() === cohort.toUpperCase()))
            .map(([cohort, values]) => (
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
            <h3 className="text-lg font-black text-slate-900">Default quiz, assignment, exam and audio prices</h3>
          </div>
        </div>

        <p className="mb-4 text-sm leading-6 text-slate-600">These are the standard fallback prices for paid quiz retakes, assignment resubmissions, exam retakes and required audio. A cohort-specific price above takes precedence.</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InputField label="Exam retake" value={String(settings.assessmentPricing.missedExam)} onChange={(value) => setAssessmentFee('missedExam', value)} />
          <InputField label="Quiz retake" value={String(settings.assessmentPricing.missedQuiz)} onChange={(value) => setAssessmentFee('missedQuiz', value)} />
          <InputField label="Assignment resubmission" value={String(settings.assessmentPricing.missedAssignment)} onChange={(value) => setAssessmentFee('missedAssignment', value)} />
          <InputField label="Required audio recording" value={String(settings.assessmentPricing.audioRecording)} onChange={(value) => setAssessmentFee('audioRecording', value)} />
        </div>
      </div>
    </div>
  );

  const renderPayments = () => {
    const secretReady = settings.paymentGateway.secretKeyConfigured;
    const publicKeyReady = settings.paymentGateway.publicKeyConfigured;
    const credentialsMatch = settings.paymentGateway.credentialsMatch;
    return (
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700"><CreditCard className="h-5 w-5" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Global payment provider</p>
                <h3 className="text-lg font-black text-slate-900">Flutterwave checkout</h3>
                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">One gateway and currency for student tuition, assessment fees, audio purchases and admin-initiated payments.</p>
              </div>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${credentialsMatch ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {credentialsMatch ? 'Gateway connected' : 'Setup required'}
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
              Payment currency
              <select
                value={settings.paymentGateway.currency}
                onChange={(event) => setSettings((current) => ({
                  ...current,
                  paymentGateway: { ...current.paymentGateway, currency: event.target.value },
                }))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400"
              >
                {[
                  ['ZMW', 'ZMW · Zambian Kwacha'],
                  ['USD', 'USD · US Dollar'],
                  ['ZAR', 'ZAR · South African Rand'],
                  ['GBP', 'GBP · British Pound'],
                  ['KES', 'KES · Kenyan Shilling'],
                  ['NGN', 'NGN · Nigerian Naira'],
                  ['GHS', 'GHS · Ghanaian Cedi'],
                ].map(([currency, label]) => <option key={currency} value={currency}>{label}</option>)}
              </select>
            </label>

            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-emerald-900">Online payments connect automatically</p>
                <p className="mt-1 text-[11px] text-emerald-800">Student checkouts use the Flutterwave credentials configured in the PHP API. No permission switch is required.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Server credentials</p>
              <h3 className="mt-1 text-base font-black text-slate-900">Secure Flutterwave connection</h3>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${settings.paymentGateway.mode === 'live' ? 'bg-rose-100 text-rose-700' : settings.paymentGateway.mode === 'test' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>
              {settings.paymentGateway.mode === 'unconfigured' ? 'keys missing' : settings.paymentGateway.mode === 'mismatched' ? 'keys mismatch' : `${settings.paymentGateway.mode} mode`}
            </span>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <p className="flex items-center gap-2 text-slate-700">{secretReady ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-600" />} Flutterwave secret key {secretReady ? 'configured' : 'missing'}</p>
            <p className="flex items-center gap-2 text-slate-700">{publicKeyReady ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-600" />} Flutterwave public key {publicKeyReady ? 'configured' : 'missing'}</p>
            {settings.paymentGateway.mode === 'mismatched' && <p className="text-xs font-semibold text-rose-700">Use matching test keys or matching live keys. Checkout remains disabled until both key modes match.</p>}
          </div>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
            Checkout opens securely inside this portal. Configure matching <code className="font-bold">FLW_PUBLIC_KEY</code> and <code className="font-bold">FLW_SECRET_KEY</code> values in the PHP hosting environment. The public key is used only to open Flutterwave Inline Checkout; the secret key stays on the server for transaction verification. No checkout redirect URL is required. Use test keys for test mode and live keys only after successful test payments.
          </div>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">Changing the currency affects new checkouts and newly generated charges. Existing ledger entries retain their original transaction currency.</p>
        </section>
      </div>
    );
  };

  const renderAlerts = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Alert policy</p>
        <p className="mt-2 text-sm font-semibold text-amber-900">The attendance report includes a below-75% filter. Alert thresholds and delivery channels are not configurable on this page; existing in-app and email notifications follow their event workflows.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Existing notification channels</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {['In-app notifications', 'Email (server-configured)'].map((channel) => (
            <div key={channel} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">{channel}</div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSystem = () => (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Settings storage</p>
        <p className="mt-3 text-sm font-semibold text-slate-700">Academic terms, cohort names, fee schedules, and payment preferences are stored in the school database and used by the relevant student billing and assessment flows.</p>
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
          disabled={isSaving || isLoading}
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
              {activeTab === 'Admissions' && renderAdmissions()}
              {activeTab === 'Finance' && renderFinance()}
              {activeTab === 'Payments' && renderPayments()}
              {activeTab === 'Alerts' && renderAlerts()}
              {activeTab === 'System' && renderSystem()}
            </>
          )}
        </div>
      </div>

      {message && (
        <div className={`rounded-2xl border px-4 py-3 text-xs font-semibold ${
          messageIsError
            ? 'border-rose-200 bg-rose-50 text-rose-800'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
        }`}>
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
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
      />
    </label>
  );
}