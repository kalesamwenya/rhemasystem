'use client';

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { ArrowDown, ArrowLeft, Ban, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Copy, CreditCard, Eye, Filter, Mail, RefreshCw, Search, ShieldCheck, X } from 'lucide-react';
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

type ApplicationDocument = {
  id: number;
  document_type: 'nrc_or_passport' | 'birth_certificate' | 'results_certificate' | 'passport_photo';
  file_name: string;
  mime_type: string;
  file_size: number;
};

type DocumentPreview = {
  url: string;
  fileName: string;
  mimeType: string;
};

type ApplicationRecord = {
  id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  program: string;
  status: string;
  payment_status: 'Pending' | 'Paid' | 'Failed' | 'Not required';
  application_data: Record<string, unknown>;
  student_id: string | null;
  created_at: string;
  recommendations: { pastoral: Recommendation; personal: Recommendation };
  recommendation_invites: { pastoral: RecommendationInvite; personal: RecommendationInvite };
  documents: ApplicationDocument[];
};

type ApiResponse<T> = { success?: boolean; message?: string; data?: T };
type ApprovalCredentials = { applicationId: string; cohort: string; studentId: string; password: string };
const cohorts = ['FYM', 'FYE', 'SYM', 'SYE'] as const;
const applicationStatuses = ['Submitted', 'Recommendations pending', 'Payment pending', 'Under review', 'Interview scheduled', 'Approved', 'Rejected'];
const pageSize = 10;

const detailSections: { title: string; fields: string[] }[] = [
  { title: 'Applicant details', fields: ['firstName', 'lastName', 'dateOfBirth', 'nrcPassportNumber', 'nationality', 'phone', 'email', 'confirmEmail', 'yearApplyingFor', 'preferredClass', 'addressLine1', 'addressLine2', 'city', 'province', 'postalCode', 'country'] },
  { title: 'Education', fields: ['hasFiveOLevelCredits', 'highSchoolAttended', 'secondarySchool', 'collegeAttended', 'diplomaEarned', 'collegeCompletionYear', 'currentSchool', 'qualifications', 'examResults', 'previousSchoolAddress', 'supportNeeds'] },
  { title: 'Pastoral recommender details', fields: ['pastoralRecommenderName', 'recommendationPastoralName', 'recommendationPastoralPhone', 'recommendationPastoralEmail', 'recommendationPastoralChurch', 'recommendationPastoralPosition', 'recommendationPastoralAddress'] },
  { title: 'Personal recommender details', fields: ['personalReferenceName', 'personalReferenceEmail', 'personalReferencePhone', 'personalReferenceAddress', 'personalReferenceRelation', 'personalReferenceDuration'] },
  { title: 'Emergency contact', fields: ['emergencyContactName', 'emergencyContactRelationship', 'emergencyContactPhone', 'emergencyContactEmail', 'emergencyContactAddress', 'guardianName', 'guardianPhone', 'guardianEmail', 'guardianRelation', 'nextOfKinName', 'nextOfKinPhone', 'nextOfKinEmail', 'nextOfKinAddress', 'nextOfKinRelation'] },
  { title: 'Spiritual background', fields: ['salvationDate', 'baptismDate', 'churchAffiliation', 'pastorName', 'churchAttendanceDuration', 'ministryExperience'] },
  { title: 'Declarations', fields: ['declarationAccuracy', 'declarationRecommenders'] },
];

const reviewTabs = [
  { id: 'applicant', label: 'Applicant & education', sections: ['Applicant details', 'Education'] },
  { id: 'references', label: 'Recommendations', sections: ['Pastoral recommender details', 'Personal recommender details'] },
  { id: 'background', label: 'Background & contacts', sections: ['Emergency contact', 'Spiritual background'] },
  { id: 'documents', label: 'Documents', sections: [] },
  { id: 'other', label: 'Other information', sections: ['Declarations'] },
] as const;

const legacyDocumentFields = [
  ['passportPhoto', 'Passport photo'],
  ['birthCertificate', 'Birth certificate'],
  ['reportCard', 'Academic report / transcript'],
  ['idDocument', 'Identification document'],
] as const;

const fieldLabels: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  studentName: 'Full name',
  dateOfBirth: 'Date of birth',
  nrcPassportNumber: 'NRC / passport number',
  gender: 'Gender',
  nationality: 'Nationality',
  homeAddress: 'Home address',
  phone: 'Phone',
  email: 'Email',
  program: 'Programme',
  startTerm: 'Preferred start term',
  yearApplyingFor: 'Year applying for',
  preferredClass: 'Preferred class',
  addressLine1: 'Address line 1',
  addressLine2: 'Address line 2',
  city: 'City / town',
  province: 'Province / region',
  postalCode: 'Postal code',
  country: 'Country',
  hasFiveOLevelCredits: 'Five O-level credits',
  highSchoolAttended: 'High / secondary school attended',
  secondarySchool: 'Secondary school completed',
  collegeAttended: 'College / university attended',
  diplomaEarned: 'Diploma / degree earned',
  collegeCompletionYear: 'College / university completion year',
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
  emergencyContactName: 'Full name',
  emergencyContactRelationship: 'Relationship',
  emergencyContactPhone: 'Phone number',
  emergencyContactEmail: 'Email address',
  emergencyContactAddress: 'Address',
  salvationDate: 'Date you accepted Christ',
  baptismDate: 'Baptism date',
  churchAffiliation: 'Current church affiliation',
  pastorName: 'Pastor / minister',
  churchAttendanceDuration: 'Church attendance duration',
  ministryExperience: 'Ministry experience',
  declarationAccuracy: 'Accuracy declaration accepted',
  declarationRecommenders: 'Recommender contact permission accepted',
  pastoralRecommenderName: 'Pastor’s full name',
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
  const [documentPreview, setDocumentPreview] = useState<DocumentPreview | null>(null);
  const [activeReviewTab, setActiveReviewTab] = useState<(typeof reviewTabs)[number]['id']>('applicant');
  const [resendingRecommendation, setResendingRecommendation] = useState<'pastoral' | 'personal' | null>(null);

  useEffect(() => {
    if (!documentPreview) return;
    return () => URL.revokeObjectURL(documentPreview.url);
  }, [documentPreview]);

  const loadApplications = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
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

  useEffect(() => {
    if (!selectedId) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) void loadApplications(true);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [loadApplications, selectedId]);

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
  const knownFields = new Set([
    ...detailSections.flatMap((section) => section.fields),
    ...legacyDocumentFields.map(([field]) => field),
    'studentName',
    'email',
    'phone',
    'program',
  ]);
  const additionalFields = Object.entries(applicantData).filter(([key, value]) => !knownFields.has(key) && formatFieldValue(value));
  const photoValue = formatFieldValue(applicantData.passportPhoto);
  const avatarUrl = photoValue && (photoValue.startsWith('http://') || photoValue.startsWith('https://') || photoValue.includes('/'))
    ? assetUrl(photoValue)
    : '';

  const setFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  const updateStatus = async (status: 'Under review' | 'Interview scheduled' | 'Rejected') => {
    if (!selected) return;
    if (status === 'Rejected' && !window.confirm(`Reject ${selected.applicant_name}'s application? This decision cannot be changed later.`)) return;
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

  const resendRecommendation = async (type: 'pastoral' | 'personal') => {
    if (!selected) return;
    setResendingRecommendation(type);
    setError('');
    setNotice('');
    try {
      const response = await api.admissions.resendRecommendation(selected.id, type) as ApiResponse<unknown>;
      if (!response.success) throw new Error(response.message ?? 'Unable to resend the recommendation email.');
      await loadApplications(true);
      setNotice(`The ${type} recommendation email was sent.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to resend the recommendation email.');
    } finally {
      setResendingRecommendation(null);
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
    setActiveReviewTab('applicant');
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

  const viewDocument = async (document: ApplicationDocument) => {
    setError('');
    try {
      const file = await api.admissions.getDocument(document.id) as Blob;
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
        throw new Error('This document format cannot be previewed in the application.');
      }
      setDocumentPreview({
        url: URL.createObjectURL(file),
        fileName: document.file_name,
        mimeType: file.type,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to open this application document.');
    }
  };

  const viewLegacyDocument = async (applicationId: string, field: string, fileName: string) => {
    setError('');
    try {
      const file = await api.admissions.getLegacyDocument(applicationId, field) as Blob;
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
        throw new Error('This document format cannot be previewed in the application.');
      }
      setDocumentPreview({
        url: URL.createObjectURL(file),
        fileName,
        mimeType: file.type,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to open this legacy application document.');
    }
  };

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="admin-kicker">Admissions control</p><h1 className="mt-2 text-3xl font-black">{selected ? 'Application details' : 'Application review'}</h1><p className="mt-1 text-sm text-[#68746e]">{selected ? 'Review the complete application, recommendations, and admission decision.' : 'Search, filter, sort and open submitted applications for a full review.'}</p></div>
      {selected
        ? <div className="flex flex-wrap gap-2 self-start">
          <button type="button" onClick={() => void loadApplications()} className="inline-flex items-center gap-2 rounded-xl border border-[#dce3de] bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /> Refresh application</button>
          <button type="button" onClick={returnToApplications} className="inline-flex items-center gap-2 rounded-xl border border-[#dce3de] bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /> All applications</button>
        </div>
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
              <option>All payments</option>{['Pending', 'Paid', 'Failed', 'Not required'].map((status) => <option key={status}>{status}</option>)}
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
              <table className="w-full min-w-[980px] text-left">
                <thead><tr className="border-b border-[#dce3de] bg-[#f6f7f4] text-[10px] font-black uppercase tracking-wider text-[#68746e]"><th className="px-4 py-3">Applicant</th><th className="px-4 py-3">Year applying</th><th className="px-4 py-3">Preferred class</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Application status</th><th className="px-4 py-3">Fee</th><th className="px-4 py-3 text-right">Review</th></tr></thead>
                <tbody className="divide-y divide-[#e7ece8]">{visibleApplications.map((item) => <tr key={item.id} className="text-xs hover:bg-[#f8faf8]">
                  <td className="px-4 py-3"><p className="font-bold text-slate-900">{item.applicant_name}</p><p className="mt-1 text-[10px] text-slate-500">{item.applicant_email} · {item.applicant_phone}</p><p className="mt-1 font-mono text-[9px] text-[#0f766e]">{item.id}</p></td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{formatFieldValue(item.application_data.yearApplyingFor) || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{formatFieldValue(item.application_data.preferredClass) || item.program || 'Not specified'}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-[#eef7f4] px-2.5 py-1 text-[9px] font-black uppercase text-[#0f766e]">{item.status}</span></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${item.payment_status === 'Paid' || item.payment_status === 'Not required' ? 'bg-emerald-50 text-emerald-700' : item.payment_status === 'Failed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>{item.payment_status}</span></td>
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

      <section className="admin-paper overflow-hidden">
        <div className="overflow-x-auto border-b border-[#dce3de] bg-[#f6f7f4]">
          <div aria-label="Application review sections" className="flex min-w-max gap-1 px-3 pt-2" role="tablist">
            {reviewTabs.map((tab) => (
              <button
                key={tab.id}
                id={`application-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={activeReviewTab === tab.id}
                aria-controls="application-review-panel"
                tabIndex={activeReviewTab === tab.id ? 0 : -1}
                onClick={() => setActiveReviewTab(tab.id)}
                onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
                  const currentIndex = reviewTabs.findIndex((item) => item.id === tab.id);
                  let nextIndex = currentIndex;
                  if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % reviewTabs.length;
                  else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + reviewTabs.length) % reviewTabs.length;
                  else if (event.key === 'Home') nextIndex = 0;
                  else if (event.key === 'End') nextIndex = reviewTabs.length - 1;
                  else return;
                  event.preventDefault();
                  const tabButtons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
                  tabButtons?.[nextIndex]?.focus();
                  setActiveReviewTab(reviewTabs[nextIndex].id);
                }}
                className={`rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-medium transition ${
                  activeReviewTab === tab.id
                    ? 'border-[#dce3de] bg-white text-[#0f766e] shadow-[0_-1px_0_rgba(15,118,110,0.12)]'
                    : 'border-transparent text-[#68746e] hover:bg-white/70 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div
          id="application-review-panel"
          role="tabpanel"
          aria-labelledby={`application-tab-${activeReviewTab}`}
          className="space-y-5 p-5 sm:p-6"
        >
          {activeReviewTab === 'documents' ? (
            <div>
              <p className="admin-kicker">Supporting documents</p>
              {selected.documents?.length || legacyDocumentFields.some(([field]) => formatFieldValue(applicantData[field]))
                ? <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {selected.documents?.map((document) => (
                    <article key={`uploaded-${document.id}`} className="rounded-xl border border-[#dce3de] bg-white p-4">
                      <p className="text-sm font-bold text-slate-900">{formatDocumentType(document.document_type)}</p>
                      <p className="mt-1 break-all text-xs text-[#68746e]">{document.file_name}</p>
                      <p className="mt-1 text-xs text-[#68746e]">{(document.file_size / (1024 * 1024)).toFixed(2)} MB</p>
                      <button type="button" onClick={() => void viewDocument(document)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#0f766e] px-3 py-2 text-xs font-bold text-white hover:bg-[#115e59]">
                        <Eye className="h-4 w-4" /> View document
                      </button>
                    </article>
                  ))}
                  {legacyDocumentFields.map(([field, label]) => {
                    const fileName = formatFieldValue(applicantData[field]);
                    if (!fileName) return null;
                    const isUrl = fileName.startsWith('https://') || fileName.startsWith('http://') || fileName.startsWith('/');
                    return <article key={`legacy-${field}`} className="rounded-xl border border-[#dce3de] bg-white p-4">
                      <p className="text-sm font-bold text-slate-900">{label}</p>
                      <p className="mt-1 break-all text-xs text-[#68746e]">{fileName}</p>
                      {isUrl
                        ? <a href={assetUrl(fileName)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#0f766e] px-3 py-2 text-xs font-bold text-white hover:bg-[#115e59]"><Eye className="h-4 w-4" /> View document</a>
                        : <button type="button" onClick={() => void viewLegacyDocument(selected.id, field, fileName)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#0f766e] px-3 py-2 text-xs font-bold text-white hover:bg-[#115e59]"><Eye className="h-4 w-4" /> View document</button>}
                    </article>;
                  })}
                </div>
                : <p className="mt-3 text-sm text-[#68746e]">No uploaded application documents are available.</p>}
            </div>
          ) : activeReviewTab === 'references' ? (
            <>
              {renderReviewSections(reviewTabs.find((tab) => tab.id === activeReviewTab)?.sections ?? [], detailSections, applicantData)}
              <p className="text-xs text-[#68746e]">Resending creates a fresh secure link and invalidates the previous invitation.</p>
              <div className="grid gap-5 md:grid-cols-2">
                <RecommendationCard
                  title="Pastoral recommendation"
                  recommendation={selected.recommendations.pastoral}
                  invite={selected.recommendation_invites?.pastoral}
                  onResend={() => void resendRecommendation('pastoral')}
                  resending={resendingRecommendation === 'pastoral'}
                  applicationClosed={['Approved', 'Rejected'].includes(selected.status)}
                />
                <RecommendationCard
                  title="Personal recommendation"
                  recommendation={selected.recommendations.personal}
                  invite={selected.recommendation_invites?.personal}
                  onResend={() => void resendRecommendation('personal')}
                  resending={resendingRecommendation === 'personal'}
                  applicationClosed={['Approved', 'Rejected'].includes(selected.status)}
                />
              </div>
            </>
          ) : activeReviewTab === 'other' ? (
            <div className="space-y-5">
              {renderReviewSections(reviewTabs.find((tab) => tab.id === activeReviewTab)?.sections ?? [], detailSections, applicantData)}
              {additionalFields.length
                ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {additionalFields.map(([key, value]) => <div key={key} className="admin-paper p-5"><p className="admin-kicker">{formatFieldLabel(key)}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm font-semibold text-slate-900">{formatFieldValue(value)}</p></div>)}
                </div>
                : <p className="text-sm text-[#68746e]">No additional application information was provided.</p>}
            </div>
          ) : (
            renderReviewSections(reviewTabs.find((tab) => tab.id === activeReviewTab)?.sections ?? [], detailSections, applicantData)
          )}
        </div>
      </section>

      <div className="admin-paper space-y-4 p-6">
        {['Approved', 'Rejected'].includes(selected.status) ? (
          <>
            <div><p className="admin-kicker">Final decision</p><h3 className="mt-2 text-xl font-black">Application {selected.status.toLowerCase()}</h3></div>
            {selected.student_id && <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">Student account created: {selected.student_id}</p>}
          </>
        ) : (
          <>
        <div><p className="admin-kicker">Decision and placement</p><h3 className="mt-2 text-xl font-black">Assign the student’s class/cohort</h3><p className="mt-2 text-sm text-[#68746e]">The selected class will be saved to the student record and determines which courses they can access.</p></div>
        <label className="block max-w-sm text-sm font-semibold">Class / cohort
          <select value={cohort} onChange={(event) => setCohort(event.target.value as (typeof cohorts)[number] | '')} className="mt-2 w-full rounded-xl border border-[#dce3de] bg-white px-3 py-3 text-sm">
            <option value="">Select class</option>
            {cohorts.map((item) => <option key={item} value={item}>{item === 'FYM' ? 'First Year Morning (FYM)' : item === 'FYE' ? 'First Year Evening (FYE)' : item === 'SYM' ? 'Second Year Morning (SYM)' : 'Second Year Evening (SYE)'}</option>)}
          </select>
        </label>
        {!recommendationsComplete && <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Approval is disabled until both the pastoral and personal recommendations have been submitted.</p>}
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={saving || ['Approved', 'Rejected'].includes(selected.status)} onClick={() => void updateStatus('Interview scheduled')} className="inline-flex items-center gap-2 rounded-xl bg-[#17201d] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white disabled:opacity-50"><CalendarDays className="h-4 w-4" /> Schedule interview</button>
          <button type="button" disabled={saving || ['Approved', 'Rejected'].includes(selected.status)} onClick={() => void updateStatus('Under review')} className="inline-flex items-center gap-2 rounded-xl border border-[#dce3de] bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#17201d] disabled:opacity-50"><ClipboardCheck className="h-4 w-4" /> Mark under review</button>
          <button type="button" onClick={() => void approveApplication()} disabled={saving || ['Approved', 'Rejected'].includes(selected.status) || !recommendationsComplete || !cohort} className="inline-flex items-center gap-2 rounded-xl bg-[#0f766e] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> {saving ? 'Saving...' : 'Approve and create student'}</button>
          <button type="button" disabled={saving || ['Approved', 'Rejected'].includes(selected.status)} onClick={() => void updateStatus('Rejected')} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"><Ban className="h-4 w-4" /> Reject application</button>
        </div>
          </>
        )}
      </div>
    </section>}
    {documentPreview && <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-3 sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setDocumentPreview(null);
      }}
    >
      <section
        aria-labelledby="application-document-preview-title"
        aria-modal="true"
        className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-[#68746e]">Application document</p>
            <h2 id="application-document-preview-title" className="truncate text-base font-black text-slate-950">{documentPreview.fileName}</h2>
          </div>
          <button
            aria-label="Close document preview"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            onClick={() => setDocumentPreview(null)}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-2 sm:p-4">
          {documentPreview.mimeType === 'application/pdf'
            ? <iframe title={documentPreview.fileName} src={documentPreview.url} className="h-[75vh] min-h-[24rem] w-full rounded-lg bg-white" />
            : <div className="flex min-h-[50vh] items-center justify-center">
              <img src={documentPreview.url} alt={documentPreview.fileName} className="max-h-[75vh] max-w-full rounded-lg object-contain shadow" />
            </div>}
        </div>
        <footer className="flex shrink-0 justify-end border-t border-slate-200 px-4 py-3 sm:px-6">
          <a href={documentPreview.url} download={documentPreview.fileName} className="rounded-lg bg-[#0f766e] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#115e59]">
            Download document
          </a>
        </footer>
      </section>
    </div>}
  </div>;
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <article className="admin-paper p-4"><p className="admin-kicker">{label}</p><p className="mt-2 text-2xl font-black text-slate-950">{value}</p></article>;
}

function formatDocumentType(type: ApplicationDocument['document_type']) {
  if (type === 'nrc_or_passport') return 'NRC or passport';
  if (type === 'birth_certificate') return 'Birth certificate';
  if (type === 'results_certificate') return 'Student results / Grade 12 certificate';
  return 'Passport-size photo';
}

function renderReviewSections(
  sectionTitles: readonly string[],
  sections: typeof detailSections,
  applicantData: Record<string, unknown>,
) {
  const visibleSections = sections.filter((section) => sectionTitles.includes(section.title));
  return <div className="grid gap-4 md:grid-cols-2">
    {visibleSections.map((section) => {
      const fields = section.fields
        .map((key) => ({ key, value: formatFieldValue(applicantData[key]) }))
        .filter((field) => field.value);
      if (!fields.length && section.title !== 'Applicant details') return null;
      return <section key={section.title} className="admin-paper p-5">
        <p className="admin-kicker">{section.title}</p>
        <div className="mt-3 space-y-3">
          {section.title === 'Applicant details' && <>
            <DetailField label="Full name" value={formatFieldValue(applicantData.studentName) || `${formatFieldValue(applicantData.firstName)} ${formatFieldValue(applicantData.lastName)}`.trim()} />
            <DetailField label="Email" value={formatFieldValue(applicantData.email)} />
            <DetailField label="Phone" value={formatFieldValue(applicantData.phone)} />
          </>}
          {fields
            .filter(({ key }) => section.title !== 'Applicant details' || !['studentName', 'firstName', 'lastName', 'email', 'phone'].includes(key))
            .map((field) => <DetailField key={field.key} label={formatFieldLabel(field.key)} value={field.value} />)}
        </div>
      </section>;
    })}
  </div>;
}

function DetailField({ label, value, documentUrl, onView }: { label: string; value: string; documentUrl?: string; onView?: () => void }) {
  return <div className="border-b border-[#edf0ed] pb-2 last:border-0 last:pb-0">
    <p className="text-[10px] font-bold uppercase tracking-wide text-[#68746e]">{label}</p>
    {documentUrl
      ? <a href={documentUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#0f766e] underline">{value}<ArrowDown className="h-3 w-3" /></a>
      : onView
        ? <button type="button" onClick={onView} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#0f766e] underline"><Eye className="h-3.5 w-3.5" />{value}</button>
      : <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-slate-900">{value}</p>}
  </div>;
}

function RecommendationCard({
  title,
  recommendation,
  invite,
  onResend,
  resending,
  applicationClosed,
}: {
  title: string;
  recommendation: Recommendation;
  invite: RecommendationInvite;
  onResend: () => void;
  resending: boolean;
  applicationClosed: boolean;
}) {
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
    {!submitted && invite && invite.recommender_email && !applicationClosed && <button
      type="button"
      onClick={onResend}
      disabled={resending}
      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#0f766e]/20 bg-[#eef7f4] px-3 py-2 text-xs font-bold text-[#0f766e] transition hover:bg-[#dff1ea] disabled:cursor-wait disabled:opacity-60"
    >
      <Mail className="h-4 w-4" />{resending ? 'Sending email…' : 'Resend recommendation email'}
    </button>}
    {recommendation && <div className="mt-3 space-y-2 border-t border-[#dce3de] pt-3 text-sm">
      <p><strong>Email:</strong> {recommendation.recommender_email}</p>
      {recommendation.relationship && <p><strong>Relationship:</strong> {recommendation.relationship}</p>}
      <p className="whitespace-pre-wrap">{recommendation.comments}</p>
      {recommendation.attachment_url && <p><strong>Attachment:</strong> {recommendation.attachment_url}</p>}
      <p className="text-xs text-[#68746e]">Submitted {new Date(recommendation.submitted_at).toLocaleString()}</p>
    </div>}
  </div>;
}
