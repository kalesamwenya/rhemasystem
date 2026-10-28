'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import SlipFeedbackAlert from '@/components/slips/SlipFeedbackAlert';
import { usePublicSlipStudent } from '@/components/slips/usePublicSlipStudent';

const violationOptions = [
  'DISORDERLY/NOISY',
  'DISTURBING INSTRUCTOR',
  'MISCONDUCT',
  'NO STUDENT ID',
  'DOZING',
  'PHONE RINGING/TEXTING',
  'SLOUCHING',
  'Other',
];

const steps = ['Student details', 'Violated codes', 'Acknowledgement'];
const inputClass = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-600 focus:ring-4 focus:ring-red-100';
const labelClass = 'block text-sm font-bold text-slate-800';

type Feedback = {
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
};

type SlipResponse = {
  data?: {
    student_name: string;
    cohort_name: string;
    term_id: number;
    details: string;
    violations_this_term: number;
    flagged: boolean;
  };
};

type AcademicTerm = { term_id: number; start_date: string; end_date: string };
type OptionsResponse = { data?: { cohorts: string[]; academic_terms: AcademicTerm[] } };

function localDateTime() {
  const now = new Date();
  const date = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return { date: date.toISOString().slice(0, 10), time: date.toISOString().slice(11, 16) };
}

export default function CodeViolationSlipPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [studentId, setStudentId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cohort, setCohort] = useState('');
  const [cohorts, setCohorts] = useState<string[]>([]);
  const [termId, setTermId] = useState('');
  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>([]);
  const [date, setDate] = useState(() => localDateTime().date);
  const [time, setTime] = useState(() => localDateTime().time);
  const [violations, setViolations] = useState<string[]>([]);
  const [otherViolation, setOtherViolation] = useState('');
  const [generalDressing, setGeneralDressing] = useState(false);
  const [spiritDay, setSpiritDay] = useState(false);
  const [email, setEmail] = useState('');
  const [acknowledgementName, setAcknowledgementName] = useState('');
  const [administrationSignoff, setAdministrationSignoff] = useState('');
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const fillStudentDetails = useCallback((student: { name: string; email: string; class: string }) => {
    const nameParts = student.name.trim().split(/\s+/);
    setFirstName(nameParts[0] || '');
    setLastName(nameParts.length > 1 ? nameParts[nameParts.length - 1] : '');
    const matchingCohort = cohorts.find(
      (option) => option.trim().toLowerCase() === student.class.trim().toLowerCase(),
    );
    setCohort(matchingCohort || '');
    setEmail(student.email || '');
  }, [cohorts]);
  const studentLookup = usePublicSlipStudent(studentId, fillStudentDetails);

  useEffect(() => {
    let active = true;
    api.attendance.publicSlipOptions()
      .then((response: OptionsResponse) => {
        if (!active) return;
        if (!response.data?.cohorts || !Array.isArray(response.data.academic_terms)) throw new Error('The slip options response was incomplete.');
        setCohorts(response.data.cohorts);
        setAcademicTerms(response.data.academic_terms);
      })
      .catch((cause: unknown) => {
        if (active) setFeedback({
          type: 'error',
          title: 'Unable to load form options',
          message: cause instanceof Error ? cause.message : 'Unable to load slip options.',
        });
      })
      .finally(() => { if (active) setLoadingOptions(false); });
    return () => { active = false; };
  }, []);

  const toggleViolation = (option: string) => {
    setViolations((selected) => selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option]);
  };

  const validateStep = (index: number) => {
    const panel = formRef.current?.querySelector<HTMLElement>(`[data-wizard-step="${index}"]`);
    const requiredControls = panel?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(':required');
    if (requiredControls && Array.from(requiredControls).some((control) => !control.checkValidity())) {
      setFeedback({
        type: 'error',
        title: 'Check the required fields',
        message: 'Complete each required field on this step before continuing.',
      });
      return false;
    }
    if (index === 1 && violations.length === 0 && !generalDressing && !spiritDay) {
      setFeedback({
        type: 'error',
        title: 'Select a violation',
        message: 'Choose at least one violated code or dress-code item before continuing.',
      });
      return false;
    }
    if (index === 1 && violations.includes('Other') && !otherViolation.trim()) {
      setFeedback({
        type: 'error',
        title: 'Describe the other violation',
        message: 'Add a short description for the selected Other violation.',
      });
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (validateStep(step)) setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateStep(step)) return;
    setSaving(true);
    try {
      const response = await api.attendance.submitStudentSlip({
        type: 'code_violation',
        student_id: studentId.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        cohort_name: cohort,
        term_id: Number(termId),
        incident_date: date,
        incident_time: time,
        violation_codes: violations,
        other_violation: otherViolation.trim(),
        general_dressing_violation: generalDressing,
        spirit_day_violation: spiritDay,
        email: email.trim(),
        acknowledgement_name: acknowledgementName.trim(),
        administration_signoff: administrationSignoff.trim(),
      }) as SlipResponse;
      if (!response.data) throw new Error('The school system did not confirm the slip submission.');
      setFeedback({
        type: response.data.flagged ? 'warning' : 'success',
        title: response.data.flagged ? 'Slip recorded — follow-up required' : 'Slip submitted successfully',
        message: `Recorded for ${response.data.student_name} · ${response.data.cohort_name} · Term ${response.data.term_id}.\nViolations recorded this term: ${response.data.violations_this_term}.${response.data.flagged ? '\nThe student has exceeded three violations and is flagged for Student Affairs follow-up.' : ''}`,
      });
    } catch (cause) {
      setFeedback({
        type: 'error',
        title: 'Unable to submit slip',
        message: cause instanceof Error ? cause.message : 'Unable to submit this code-of-conduct slip.',
      });
    } finally {
      setSaving(false);
    }
  };

  const checkbox = (checked: boolean, onChange: () => void, label: string) => (
    <label key={label} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700 transition hover:border-red-300 hover:bg-red-50/50">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-red-700" />
      <span>{label}</span>
    </label>
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 rounded-3xl bg-slate-950 p-6 text-white shadow-lg sm:p-8">
          <div className="mb-4 inline-flex rounded-2xl bg-white/10 p-3 text-amber-300"><ShieldCheck className="h-6 w-6" /></div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Student Affairs · Code of Conduct</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Code violation slip</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Complete each step to record the incident. More than three violations in one term flags the student for follow-up.</p>
        </header>

        <form ref={formRef} noValidate onSubmit={submit} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-8">
            <ol aria-label="Form progress" className="grid grid-cols-3 gap-2">
              {steps.map((title, index) => (
                <li key={title} className={`flex items-center gap-2 text-xs font-bold sm:text-sm ${index <= step ? 'text-red-800' : 'text-slate-400'}`}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${index < step ? 'bg-red-800 text-white' : index === step ? 'bg-red-100 text-red-900 ring-2 ring-red-700' : 'bg-slate-200 text-slate-500'}`}>
                    {index < step ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </span>
                  <span>{title}</span>
                </li>
              ))}
            </ol>
          </div>

          <section data-wizard-step={0} hidden={step !== 0} className="space-y-5 p-5 sm:p-8">
            <div>
              <h2 className="text-xl font-black text-slate-950">Student and incident details</h2>
              <p className="mt-1 text-sm text-slate-500">Enter the student information and when the incident occurred.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>Student number <span className="text-red-600">*</span><input required maxLength={50} autoComplete="off" value={studentId} onChange={(event) => { setStudentId(event.target.value); setFirstName(''); setLastName(''); setEmail(''); setCohort(''); }} className={inputClass} />
                {studentLookup.state === 'loading' && <span className="mt-1 block text-xs font-medium text-slate-500">Looking up student…</span>}
                {studentLookup.state === 'found' && <span className="mt-1 block text-xs font-medium text-emerald-700">Student record found. Details filled in.</span>}
                {(studentLookup.state === 'not-found' || studentLookup.state === 'error') && <span role="status" className="mt-1 block text-xs font-medium text-red-700">{studentLookup.error}</span>}
              </label>
              <label className={labelClass}>First name <span className="text-red-600">*</span><input required maxLength={120} autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} className={inputClass} /></label>
              <label className={labelClass}>Last name <span className="text-red-600">*</span><input required maxLength={120} autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} className={inputClass} /></label>
              <label className={labelClass}>Cohort <span className="text-red-600">*</span>
                <select required value={cohort} onChange={(event) => setCohort(event.target.value)} disabled={loadingOptions || cohorts.length === 0} className={inputClass}>
                  <option value="">{loadingOptions ? 'Loading cohorts…' : 'Please select'}</option>
                  {cohorts.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className={labelClass}>Incident date <span className="text-red-600">*</span><input required type="date" value={date} onChange={(event) => {
                const nextDate = event.target.value;
                setDate(nextDate);
                const selectedTerm = academicTerms.find((term) => String(term.term_id) === termId);
                if (selectedTerm && (nextDate < selectedTerm.start_date || nextDate > selectedTerm.end_date)) setTermId('');
              }} className={inputClass} /></label>
              <label className={labelClass}>Incident time <span className="text-red-600">*</span><input required type="time" value={time} onChange={(event) => setTime(event.target.value)} className={inputClass} /></label>
              <label className={labelClass}>Academic session <span className="text-red-600">*</span>
                <select required value={termId} onChange={(event) => setTermId(event.target.value)} disabled={loadingOptions || academicTerms.length === 0} className={inputClass}>
                  <option value="">{loadingOptions ? 'Loading academic sessions…' : 'Choose the session for this incident'}</option>
                  {academicTerms.map((term) => (
                    <option key={term.term_id} value={term.term_id} disabled={date < term.start_date || date > term.end_date}>
                      Term {term.term_id} · {term.start_date} to {term.end_date}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section data-wizard-step={1} hidden={step !== 1} className="space-y-6 p-5 sm:p-8">
            <div>
              <h2 className="text-xl font-black text-slate-950">Violated codes</h2>
              <p className="mt-1 text-sm text-slate-500">Choose every applicable item. Select at least one code or dress-code item.</p>
            </div>
            <fieldset>
              <legend className="mb-3 text-sm font-bold text-slate-800">Violated Codes</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {violationOptions.map((option) => checkbox(violations.includes(option), () => toggleViolation(option), option))}
              </div>
              {violations.includes('Other') && (
                <label className={`${labelClass} mt-4`}>Other violation details <span className="text-red-600">*</span><input required maxLength={1000} value={otherViolation} onChange={(event) => setOtherViolation(event.target.value)} className={inputClass} /></label>
              )}
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-sm font-bold text-slate-800">General Dressing</legend>
              {checkbox(generalDressing, () => setGeneralDressing((value) => !value), 'DRESS CODE')}
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-sm font-bold text-slate-800">Spirit Day</legend>
              {checkbox(spiritDay, () => setSpiritDay((value) => !value), 'DRESS CODE')}
            </fieldset>
          </section>

          <section data-wizard-step={2} hidden={step !== 2} className="space-y-5 p-5 sm:p-8">
            <div>
              <h2 className="text-xl font-black text-slate-950">Acknowledgement and sign-off</h2>
              <p className="mt-1 text-sm text-slate-500">Add the contact email and names for the signed paper slip.</p>
            </div>
            <label className={labelClass}>Email <span className="text-red-600">*</span><input required type="email" maxLength={255} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /><span className="mt-1 block text-xs font-medium text-slate-500">An email address is required for this slip record.</span></label>
            <label className={labelClass}>Student acknowledgement<input maxLength={255} value={acknowledgementName} onChange={(event) => setAcknowledgementName(event.target.value)} className={inputClass} /><span className="mt-1 block text-xs font-medium text-slate-500">Full name</span></label>
            <label className={labelClass}>Administration sign-off<input maxLength={255} value={administrationSignoff} onChange={(event) => setAdministrationSignoff(event.target.value)} className={inputClass} /><span className="mt-1 block text-xs font-medium text-slate-500">Name</span></label>
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-5 text-amber-950">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <p>More than three recorded violations in an academic term trigger a Student Affairs flag. Keep the signed slip for your records.</p>
            </div>
          </section>

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-8">
            <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || saving} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">
              <ArrowLeft className="h-4 w-4" />Previous
            </button>
            {step < steps.length - 1 ? (
              <button type="button" onClick={goNext} disabled={loadingOptions || saving} className="inline-flex items-center gap-2 rounded-xl bg-red-800 px-5 py-3 text-sm font-black text-white transition hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-60">
                Next<ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-red-800 px-5 py-3 text-sm font-black text-white transition hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</> : <>Submit slip<CheckCircle2 className="h-4 w-4" /></>}
              </button>
            )}
          </div>
        </form>
      </div>
      {feedback && <SlipFeedbackAlert {...feedback} onClose={() => setFeedback(null)} confirmText={feedback.type === 'success' || feedback.type === 'warning' ? 'Done' : 'Go back'} />}
    </main>
  );
}
