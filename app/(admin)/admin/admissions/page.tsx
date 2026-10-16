'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Copy, CreditCard, Eye, Filter, Search, ShieldCheck } from 'lucide-react';
import { api, assetUrl } from '@/lib/api';

type Recommendation = {
  recommender_name: string;
  recommender_email: string;
  relationship: string;
  comments: string;
  attachment_url: string;
  submitted_at: string;
} | null;

type RecommendationInvite = {
  recommender_name: string;
  recommender_email: string;
  recommender_phone: string;
  last_channel: 'email' | 'whatsapp' | 'sms' | null;
  delivery_status: 'pending' | 'sent' | 'failed' | 'submitted';
  sent_at: string | null;
  submitted_at: string | null;
  expires_at: string;
} | null;

type ApplicationRecord = {
  id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  program: string;
  status: string;
  payment_status: 'Pending' | 'Paid' | 'Failed';
  application_data: Record<string, unknown>;
  student_id: string | null;
  created_at: string;
  recommendations: { pastoral: Recommendation; personal: Recommendation };
  recommendation_invites: { pastoral: RecommendationInvite; personal: RecommendationInvite };
};

type ApiResponse<T> = { success?: boolean; message?: string; data?: T };
type ApprovalCredentials = { applicationId: string; cohort: string; studentId: string; password: string };
const cohorts = ['FYM', 'FYE', 'SYM', 'SYE'] as const;
const applicationStatuses = ['Submitted', 'Recommendations pending', 'Payment pending', 'Under review', 'Interview scheduled', 'Approved', 'Rejected'];
const pageSize = 10;

const detailSections: { title: string; fields: string[] }[] = [
  { title: 'Personal information', fields: ['studentName', 'dateOfBirth', 'gender', 'nationality', 'homeAddress', 'phone', 'email', 'program', 'startTerm'] },
  { title: 'Education and qualifications', fields: ['currentSchool', 'qualifications', 'examResults', 'previousSchoolAddress', 'supportNeeds'] },
  { title: 'Parent / guardian', fields: ['guardianName', 'guardianPhone', 'guardianEmail', 'guardianRelation'] },
  { title: 'Next of kin', fields: ['nextOfKinName', 'nextOfKinPhone', 'nextOfKinEmail', 'nextOfKinAddress', 'nextOfKinRelation'] },
  { title: 'Pastoral recommender details', fields: ['recommendationPastoralName', 'recommendationPastoralPhone', 'recommendationPastoralEmail', 'recommendationPastoralChurch', 'recommendationPastoralPosition', 'recommendationPastoralAddress'] },
  { title: 'Personal reference details', fields: ['personalReferenceName', 'personalReferenceEmail', 'personalReferencePhone', 'personalReferenceAddress', 'personalReferenceRelation', 'personalReferenceDuration'] },
  { title: 'Supporting documents', fields: ['passportPhoto', 'birthCertificate', 'reportCard', 'idDocument'] },
];

const fieldLabels: Record<string, string> = {
  studentName: 'Full name',
  dateOfBirth: 'Date of birth',
  gender: 'Gender',
  nationality: 'Nationality',
  homeAddress: 'Home address',
  phone: 'Phone',
  email: 'Email',
  program: 'Programme',
  startTerm: 'Preferred start term',
  currentSchool: 'Current / previous school',
  qualifications: 'Academic qualifications',
  examResults: 'Exam results / grades',
  previousSchoolAddress: 'Previous school address',
  supportNeeds: 'Support needs / accommodations',
  guardianName: 'Guardian name',
  guardianPhone: 'Guardian phone',
  guardianEmail: 'Guardian email',
  guardianRelation: 'Relationship',
  nextOfKinName: 'Next of kin name',
  nextOfKinPhone: 'Next of kin phone',
  nextOfKinEmail: 'Next of kin email',
  nextOfKinAddress: 'Next of kin address',
  nextOfKinRelation: 'Relationship',
  recommendationPastoralName: 'Recommender name',
  recommendationPastoralPhone: 'Phone',
  recommendationPastoralEmail: 'Email',
  recommendationPastoralChurch: 'Church',
  recommendationPastoralPosition: 'Position / role',
  recommendationPastoralAddress: 'Address',
  personalReferenceName: 'Reference name',
  personalReferenceEmail: 'Email',
  personalReferencePhone: 'Phone',
  personalReferenceAddress: 'Address',
  personalReferenceRelation: 'Relationship',
  personalReferenceDuration: 'Known for',
  passportPhoto: 'Passport photo',
  birthCertificate: 'Birth certificate',
  reportCard: 'Academic report / transcript',
  idDocument: 'Identification document',
};

const formatFieldLabel = (key: string) => fieldLabels[key] || key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase());
const formatFieldValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) return value.map(formatFieldValue).filter(Boolean).join(', ');
  if (typeof value === 'object') return Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => `${formatFieldLabel(key)}: ${formatFieldValue(item)}`)
    .filter((item) => !item.endsWith(': '))
    .join('\n');
  return String(value);
};

const searchApplication = (item: ApplicationRecord) => [
  item.id,
  item.applicant_name,
  item.applicant_email,
  item.applicant_phone,
  item.program,
  item.status,
  item.payment_status,
  ...Object.values(item.application_data || {}).map(formatFieldValue),
].join(' ').toLowerCase();

export default function AdmissionsPage() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [paymentFilter, setPaymentFilter] = useState('All payments');
  const [programFilter, setProgramFilter] = useState('All programmes');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'status'>('newest');
  const [page, setPage] = useState(1);
  const [cohort, setCohort] = useState<(typeof cohorts)[number] | ''>('');
  const [credentials, setCredentials] = useState<ApprovalCredentials | null>(null);
  const [credentialsCopied, setCredentialsCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadApplications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.admissions.list() as ApiResponse<ApplicationRecord[]>;
      if (!response.success || !response.data) throw new Error(response.message ?? 'Unable to load admissions applications.');
      setApplications(response.data);
      setSelectedId((current) => current && response.data?.some((item) => item.id === current) ? current : '');
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load admissions applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadApplications(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadApplications]);

  const programs = useMemo(() => Array.from(new Set(applications.map((item) => item.program).filter(Boolean))).sort(), [applications]);
  const filtered = useMemo(() => applications
    .filter((item) => statusFilter === 'All statuses' || item.status === statusFilter)
    .filter((item) => paymentFilter === 'All payments' || item.payment_status === paymentFilter)
    .filter((item) => programFilter === 'All programmes' || item.program === programFilter)
    .filter((item) => !query.trim() || searchApplication(item).includes(query.trim().toLowerCase()))
    .sort((left, right) => {
      if (sortBy === 'name') return left.applicant_name.localeCompare(right.applicant_name);
      if (sortBy === 'status') return left.status.localeCompare(right.status) || left.applicant_name.localeCompare(right.applicant_name);
      const dateDifference = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
      return sortBy === 'oldest' ? dateDifference : -dateDifference;
    }), [applications, paymentFilter, programFilter, query, sortBy, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visiblePage = Math.min(page, pageCount);
  const visibleApplications = filtered.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);
  const selected = applications.find((item) => item.id === selectedId);
  const recommendationsComplete = Boolean(selected?.recommendations.pastoral && selected.recommendations.personal);
  const applicantData = selected?.application_data || {};
  const knownFields = new Set(detailSections.flatMap((section) => section.fields));
  const additionalFields = Object.entries(applicantData).filter(([key, value]) => !knownFields.has(key) && formatFieldValue(value));
  const photoValue = formatFieldValue(applicantData.passportPhoto);
  const avatarUrl = photoValue && (photoValue.startsWith('http://') || photoValue.startsWith('https://') || photoValue.includes('/'))
    ? assetUrl(photoValue)
    : '';

  const setFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const updateStatus = async (status: 'Under review' | 'Interview scheduled') => {
    if (!selected) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await api.admissions.update({ application_id: selected.id, status }) as ApiResponse<unknown>;
      if (!response.success) throw new Error(response.message ?? 'Unable to update the application.');
      setNotice(`Application marked ${status.toLowerCase()}.`);
      await loadApplications();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update the application.');
    } finally {
      setSaving(false);
    }
  };

  const approveApplication = async () => {
    if (!selected || !cohort) {
      setError('Select the student’s class/cohort before approval.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    setCredentials(null);
    setCredentialsCopied(false);
    try {
      const response = await api.admissions.update({
        application_id: selected.id,
        status: 'Approved',
        cohort,
      }) as ApiResponse<{ status: string; student: { student_id: string; temporary_password: string } }>;
      if (!response.success || !response.data?.student) throw new Error(response.message ?? 'Unable to approve this application.');
      setCredentials({
        applicationId: selected.id,
        cohort,
        studentId: response.data.student.student_id,
        password: response.data.student.temporary_password,
      });
      setNotice('Application approved and student account created.');
      await loadApplications();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to approve this application.');
    } finally {
      setSaving(false);
    }
  };

  const openApplication = (id: string) => {
    setSelectedId(id);
    setCohort('');
    setCredentials(null);
    setNotice('');
    setError('');
  };

  const returnToApplications = () => {
    setSelectedId('');
    setCohort('');
    setCredentials(null);
  };

  const copyCredentials = async () => {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(
        `Student ID: ${credentials.studentId}\nTemporary password: ${credentials.password}\nCohort: ${credentials.cohort}`
      );
      setCredentialsCopied(true);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? `Could not copy credentials: ${cause.message}` : 'Could not copy credentials. Select and copy them manually.');
    }
  };

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="admin-kicker">Admissions control</p><h1 className="mt-2 text-3xl font-black">{selected ? 'Application details' : 'Application review'}</h1><p className="mt-1 text-sm text-[#68746e]">{selected ? 'Review the complete application, recommendations, and admission decision.' : 'Search, filter, sort and open submitted applications for a full review.'}</p></div>
      {selected
        ? <button type="button" onClick={returnToApplications} className="inline-flex items-center gap-2 self-start rounded-xl border border-[#dce3de] bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /> All applications</button>
        : <div className="flex items-center gap-2 rounded-xl border border-[#dce3de] bg-white px-3 py-2"><Search className="h-4 w-4 text-[#68746e]" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search name, email, ID, or details" className="w-64 bg-transparent text-sm outline-none" /></div>}
    </div>

    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</div>}
    {credentials && <div role="status" className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5">
      <h2 className="font-black text-emerald-900">Student account created — share these credentials securely</h2>
      <p className="mt-2 text-sm text-emerald-800">Application {credentials.applicationId} · Cohort {credentials.cohort}</p>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><p><strong>Student ID:</strong> <code className="select-all">{credentials.studentId}</code></p><p><strong>Temporary password:</strong> <code className="select-all">{credentials.password}</code></p></div>
      <button type="button" onClick={() => void copyCredentials()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-900">
        {credentialsCopied ? <Check size={14} /> : <Copy size={14} />}{credentialsCopied ? 'Copied' : 'Copy credentials'}
      </button>
    </div>}

    {!selected ? <>
      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Applications" value={applications.length} />
        <SummaryCard label="Awaiting review" value={applications.filter((item) => !['Approved', 'Rejected'].includes(item.status)).length} />
        <SummaryCard label="Approved" value={applications.filter((item) => item.status === 'Approved').length} />
      </section>

      <section className="admin-paper overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#dce3de] p-4 xl:flex-row xl:items-center xl:justify-between">
          <div><p className="admin-kicker">Application register</p><p className="mt-1 text-sm font-bold">{filtered.length} matching application{filtered.length === 1 ? '' : 's'}</p></div>
          <div className="grid gap-2 sm:grid-cols-2 xl:flex">
            <label className="sr-only" htmlFor="admissions-status-filter">Filter by status</label>
            <select id="admissions-status-filter" value={statusFilter} onChange={(event) => setFilter(setStatusFilter, event.target.value)} className="rounded-lg border border-[#dce3de] bg-white px-3 py-2 text-xs font-semibold text-slate-700">
              <option>All statuses</option>{applicationStatuses.map((status) => <option key={status}>{status}</option>)}
            </select>
            <label className="sr-only" htmlFor="admissions-payment-filter">Filter by payment status</label>
            <select id="admissions-payment-filter" value={paymentFilter} onChange={(event) => setFilter(setPaymentFilter, event.target.value)} className="rounded-lg border border-[#dce3de] bg-white px-3 py-2 text-xs font-semibold text-slate-700">
              <option>All payments</option>{['Pending', 'Paid', 'Failed'].map((status) => <option key={status}>{status}</option>)}
            </select>
            <label className="sr-only" htmlFor="admissions-program-filter">Filter by programme</label>
            <select id="admissions-program-filter" value={programFilter} onChange={(event) => setFilter(setProgramFilter, event.target.value)} className="rounded-lg border border-[#dce3de] bg-white px-3 py-2 text-xs font-semibold text-slate-700">
              <option>All programmes</option>{programs.map((program) => <option key={program}>{program}</option>)}
            </select>
            <label className="sr-only" htmlFor="admissions-sort">Sort applications</label>
            <select id="admissions-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="rounded-lg border border-[#dce3de] bg-white px-3 py-2 text-xs font-semibold text-slate-700">
              <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Applicant name</option><option value="status">Status</option>
            </select>
          </div>
        </div>
        {loading ? <div className="p-8 text-sm text-[#68746e]">Loading applications...</div>
          : filtered.length === 0 ? <div className="p-8 text-center text-sm text-[#68746e]"><Filter className="mx-auto mb-2 h-5 w-5" />No applications match the current search and filters.</div>
            : <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead><tr className="border-b border-[#dce3de] bg-[#f6f7f4] text-[10px] font-black uppercase tracking-wider text-[#68746e]"><th className="px-4 py-3">Applicant</th><th className="px-4 py-3">Programme</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Application status</th><th className="px-4 py-3">Fee</th><th className="px-4 py-3 text-right">Review</th></tr></thead>
                <tbody className="divide-y divide-[#e7ece8]">{visibleApplications.map((item) => <tr key={item.id} className="text-xs hover:bg-[#f8faf8]">
                  <td className="px-4 py-3"><p className="font-bold text-slate-900">{item.applicant_name}</p><p className="mt-1 text-[10px] text-slate-500">{item.applicant_email} · {item.applicant_phone}</p><p className="mt-1 font-mono text-[9px] text-[#0f766e]">{item.id}</p></td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{item.program || 'Programme pending'}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-[#eef7f4] px-2.5 py-1 text-[9px] font-black uppercase text-[#0f766e]">{item.status}</span></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${item.payment_status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : item.payment_status === 'Failed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>{item.payment_status}</span></td>
                  <td className="px-4 py-3 text-right"><button type="button" onClick={() => openApplication(item.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f766e] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-white hover:bg-[#115e59]"><Eye className="h-3.5 w-3.5" /> Read application</button></td>
                </tr>)}</tbody>
              </table>
            </div>}
        {!loading && filtered.length > 0 && <div className="flex flex-col gap-3 border-t border-[#dce3de] px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[#68746e]">Showing {(visiblePage - 1) * pageSize + 1}–{Math.min(visiblePage * pageSize, filtered.length)} of {filtered.length}</p>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Previous page" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={visiblePage === 1} className="rounded-lg border border-[#dce3de] bg-white p-2 text-slate-700 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <span className="font-bold text-slate-700">Page {visiblePage} of {pageCount}</span>
            <button type="button" aria-label="Next page" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={visiblePage === pageCount} className="rounded-lg border border-[#dce3de] bg-white p-2 text-slate-700 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>}
      </section>
    </> : <section className="space-y-5">
      <div className="admin-paper overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-[#0f766e] via-[#155e59] to-[#17201d]" />
        <div className="px-5 pb-6 sm:px-7">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-[#eef7f4] text-3xl font-black text-[#0f766e] shadow-md">
                {avatarUrl ? <img src={avatarUrl} alt={`${selected.applicant_name} application avatar`} className="h-full w-full object-cover" /> : selected.applicant_name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
              </div>
              <div className="pb-1"><p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#0f766e]">{selected.id}</p><h2 className="mt-1 text-2xl font-black text-slate-950">{selected.applicant_name}</h2><p className="mt-1 text-xs text-[#68746e]">{selected.program || 'Programme pending'} · Submitted {new Date(selected.created_at).toLocaleString()}</p></div>
            </div>
            <div className="flex flex-wrap gap-2 pb-1"><span className="inline-flex items-center gap-2 rounded-xl bg-[#eef7f4] px-3 py-2 text-xs font-bold text-[#0f766e]"><CreditCard className="h-4 w-4" />{selected.payment_status}</span><span className="inline-flex items-center gap-2 rounded-xl bg-[#fff7df] px-3 py-2 text-xs font-bold text-[#9a6700]"><ShieldCheck className="h-4 w-4" />{selected.status}</span></div>
          </div>
          {selected.student_id && <p className="mt-5 rounded-xl bg-slate-50 p-3 text-sm font-semibold">Student record already created: {selected.student_id}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {detailSections.map((section) => {
          const fields = section.fields
            .map((key) => ({ key, value: formatFieldValue(applicantData[key]) }))
            .filter((field) => field.value);
          if (section.title === 'Personal information') {
            return <div key={section.title} className="admin-paper p-5">
              <p className="admin-kicker">{section.title}</p>
              <div className="mt-3 space-y-3">
                <DetailField label="Full name" value={selected.applicant_name} />
                <DetailField label="Email" value={selected.applicant_email} />
                <DetailField label="Phone" value={selected.applicant_phone} />
                {fields.filter((field) => !['studentName', 'email', 'phone', 'program'].includes(field.key)).map((field) => <DetailField key={field.key} label={formatFieldLabel(field.key)} value={field.value} />)}
              </div>
            </div>;
          }
          return fields.length ? <div key={section.title} className="admin-paper p-5">
            <p className="admin-kicker">{section.title}</p>
            <div className="mt-3 space-y-3">{fields.map((field) => {
              const isDocument = ['passportPhoto', 'birthCertificate', 'reportCard', 'idDocument'].includes(field.key);
              const isUrl = field.value.startsWith('https://') || field.value.startsWith('http://') || field.value.startsWith('/');
              return <DetailField key={field.key} label={formatFieldLabel(field.key)} value={field.value} documentUrl={isDocument && isUrl ? assetUrl(field.value) : undefined} />;
            })}</div>
          </div> : null;
        })}
        {additionalFields.length > 0 && <div className="admin-paper p-5">
          <p className="admin-kicker">Additional application information</p>
          <div className="mt-3 space-y-3">{additionalFields.map(([key, value]) => <DetailField key={key} label={formatFieldLabel(key)} value={formatFieldValue(value)} />)}</div>
        </div>}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <RecommendationCard title="Pastoral recommendation" recommendation={selected.recommendations.pastoral} invite={selected.recommendation_invites?.pastoral} />
        <RecommendationCard title="Personal recommendation" recommendation={selected.recommendations.personal} invite={selected.recommendation_invites?.personal} />
      </div>

      <div className="admin-paper space-y-4 p-6">
        <div><p className="admin-kicker">Decision and placement</p><h3 className="mt-2 text-xl font-black">Assign the student’s class/cohort</h3><p className="mt-2 text-sm text-[#68746e]">The selected class will be saved to the student record and determines which courses they can access.</p></div>
        <label className="block max-w-sm text-sm font-semibold">Class / cohort
          <select value={cohort} onChange={(event) => setCohort(event.target.value as (typeof cohorts)[number] | '')} className="mt-2 w-full rounded-xl border border-[#dce3de] bg-white px-3 py-3 text-sm">
            <option value="">Select class</option>
            {cohorts.map((item) => <option key={item} value={item}>{item === 'FYM' ? 'First Year Morning (FYM)' : item === 'FYE' ? 'First Year Evening (FYE)' : item === 'SYM' ? 'Second Year Morning (SYM)' : 'Second Year Evening (SYE)'}</option>)}
          </select>
        </label>
        {!recommendationsComplete && <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Approval is disabled until both the pastoral and personal recommendations have been submitted.</p>}
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={saving} onClick={() => void updateStatus('Interview scheduled')} className="inline-flex items-center gap-2 rounded-xl bg-[#17201d] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white disabled:opacity-50"><CalendarDays className="h-4 w-4" /> Schedule interview</button>
          <button type="button" disabled={saving} onClick={() => void updateStatus('Under review')} className="inline-flex items-center gap-2 rounded-xl border border-[#dce3de] bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#17201d] disabled:opacity-50"><ClipboardCheck className="h-4 w-4" /> Mark under review</button>
          <button type="button" onClick={() => void approveApplication()} disabled={saving || selected.status === 'Approved' || !recommendationsComplete || !cohort} className="inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> {saving ? 'Saving...' : 'Approve and create student'}</button>
        </div>
      </div>
    </section>}
  </div>;
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <article className="admin-paper p-4"><p className="admin-kicker">{label}</p><p className="mt-2 text-2xl font-black text-slate-950">{value}</p></article>;
}

function DetailField({ label, value, documentUrl }: { label: string; value: string; documentUrl?: string }) {
  return <div className="border-b border-[#edf0ed] pb-2 last:border-0 last:pb-0">
    <p className="text-[10px] font-bold uppercase tracking-wide text-[#68746e]">{label}</p>
    {documentUrl
      ? <a href={documentUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#0f766e] underline">{value}<ArrowDown className="h-3 w-3" /></a>
      : <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-slate-900">{value}</p>}
  </div>;
}

function RecommendationCard({ title, recommendation, invite }: { title: string; recommendation: Recommendation; invite: RecommendationInvite }) {
  const submitted = Boolean(recommendation) || invite?.delivery_status === 'submitted';
  const statusLabel = submitted ? 'Submitted' : invite?.delivery_status === 'sent' ? 'Email sent' : invite?.delivery_status === 'failed' ? 'Send failed' : invite?.last_channel ? `Prepared via ${invite.last_channel}` : 'Not sent';
  return <div className="admin-paper p-5">
    <p className="admin-kicker">{title}</p>
    <div className="mt-3 flex items-center justify-between gap-3"><p className="font-bold">{recommendation?.recommender_name ?? invite?.recommender_name ?? 'Recommendation pending'}</p><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${submitted ? 'bg-[#eef7f4] text-[#0f766e]' : invite?.delivery_status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-[#fff7df] text-[#9a6700]'}`}>{statusLabel}</span></div>
    {!recommendation && invite && <div className="mt-3 space-y-1 border-t border-[#dce3de] pt-3 text-sm">
      {invite.recommender_email && <p><strong>Email:</strong> {invite.recommender_email}</p>}
      {invite.recommender_phone && <p><strong>Phone:</strong> {invite.recommender_phone}</p>}
      {invite.sent_at && <p className="text-xs text-[#68746e]">Email sent {new Date(invite.sent_at).toLocaleString()}</p>}
      <p className="text-xs text-[#68746e]">Invitation expires {new Date(invite.expires_at).toLocaleDateString()}</p>
    </div>}
    {recommendation && <div className="mt-3 space-y-2 border-t border-[#dce3de] pt-3 text-sm">
      <p><strong>Email:</strong> {recommendation.recommender_email}</p>
      {recommendation.relationship && <p><strong>Relationship:</strong> {recommendation.relationship}</p>}
      <p className="whitespace-pre-wrap">{recommendation.comments}</p>
      {recommendation.attachment_url && <p><strong>Attachment:</strong> {recommendation.attachment_url}</p>}
      <p className="text-xs text-[#68746e]">Submitted {new Date(recommendation.submitted_at).toLocaleString()}</p>
    </div>}
  </div>;
}
