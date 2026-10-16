'use client';

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Download,
  Eye,
  GraduationCap,
  Heart,
  Home,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Upload,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { api, assetUrl } from '@/lib/api';
import { exportBrandedPdf } from '@/lib/branded-pdf';

type StudentProfile = {
  student_id: string;
  name: string;
  class: string;
  email: string;
  avatar: string;
  payment_status: string;
  account_status: string;
  created_at: string;
  active_courses: number;
  attendance: { records: number };
  admission: {
    program: string;
    date_of_birth: string;
    gender: string;
    nationality: string;
    home_address: string;
    phone: string;
    start_term: string;
    current_school: string;
    qualifications: string;
    guardian_name: string;
    guardian_phone: string;
    guardian_email: string;
    guardian_relation: string;
    next_of_kin_name: string;
    next_of_kin_phone: string;
    next_of_kin_email: string;
    next_of_kin_relation: string;
  };
};

type ProfileResponse = { data: { student: StudentProfile } };
type AvatarResponse = { data: { avatar: string } };

function ProfileField({ label, value, icon, wide = false }: { label: string; value: string | number; icon?: ReactNode; wide?: boolean }) {
  const displayValue = String(value || '').trim();
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        {icon}<span>{label}</span>
      </dt>
      <dd className={`mt-2 text-sm font-semibold ${displayValue ? 'text-slate-800' : 'text-slate-400'}`}>{displayValue || 'Not provided'}</dd>
    </div>
  );
}

function ProfileSection({ title, description, icon, children }: { title: string; description?: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4">
        <span className="rounded-xl bg-blue-50 p-2.5 text-blue-900">{icon}</span>
        <div><h2 className="text-base font-black text-slate-950">{title}</h2>{description && <p className="mt-1 text-xs text-slate-500">{description}</p>}</div>
      </div>
      <dl className="grid gap-x-6 gap-y-6 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState<'view' | 'download' | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const exportProfile = async (mode: 'view' | 'download') => {
    if (!profile) return;
    setExporting(mode);
    setError('');
    try {
      await exportBrandedPdf(async () => {
        const [verificationResponse, billingResponse] = await Promise.all([
          api.students.createProfileVerificationToken() as Promise<{ data: { token: string } }>,
          api.students.myBilling() as Promise<{ data: { transactions: Array<{ entry_type: string; status: string; receipt_token?: string | null; reference: string; created_at: string }> } }>,
        ]);
        const token = verificationResponse.data.token;
        if (!/^[a-f0-9]{64}$/i.test(token)) throw new Error('The profile verification service returned an invalid token.');
        const latestPayment = billingResponse.data.transactions
          .filter((transaction) => transaction.entry_type === 'payment' && transaction.status === 'paid' && transaction.receipt_token)
          .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())[0];
        const identityUrl = new URL('/verify-profile', window.location.origin);
        identityUrl.searchParams.set('token', token);
        const verifications = [{
          label: 'Verify student profile',
          url: identityUrl.toString(),
          note: 'Official identity check',
        }];
        if (latestPayment?.receipt_token) {
          const paymentUrl = new URL('/verify-payment', window.location.origin);
          paymentUrl.searchParams.set('token', latestPayment.receipt_token);
          verifications.push({
            label: 'Verify latest payment',
            url: paymentUrl.toString(),
            note: latestPayment.reference,
          });
        }

        const admission = profile.admission;
        return {
          title: 'Student Profile',
          subtitle: 'Official identity, academic, and contact record',
          fileName: `Rhema-Student-Profile-${profile.student_id}`,
          student: { name: profile.name, id: profile.student_id, cohort: profile.class },
          sections: [
            {
              title: 'Personal details',
              fields: [
                { label: 'Full name', value: profile.name },
                { label: 'Email address', value: profile.email },
                { label: 'Phone number', value: admission.phone },
                { label: 'Date of birth', value: admission.date_of_birth },
                { label: 'Gender', value: admission.gender },
                { label: 'Nationality', value: admission.nationality },
                { label: 'Home address', value: admission.home_address },
              ],
            },
            {
              title: 'Academic details',
              fields: [
                { label: 'Student ID', value: profile.student_id },
                { label: 'Cohort', value: profile.class },
                { label: 'Programme', value: admission.program },
                { label: 'Intended start term', value: admission.start_term },
                { label: 'Previous/current school', value: admission.current_school },
                { label: 'Qualifications', value: admission.qualifications },
                { label: 'Active courses', value: String(profile.active_courses) },
                { label: 'Attendance records', value: String(profile.attendance.records) },
              ],
            },
            {
              title: 'Parent or guardian',
              fields: [
                { label: 'Name', value: admission.guardian_name },
                { label: 'Relationship', value: admission.guardian_relation },
                { label: 'Phone number', value: admission.guardian_phone },
                { label: 'Email address', value: admission.guardian_email },
              ],
            },
            {
              title: 'Next of kin',
              fields: [
                { label: 'Name', value: admission.next_of_kin_name },
                { label: 'Relationship', value: admission.next_of_kin_relation },
                { label: 'Phone number', value: admission.next_of_kin_phone },
                { label: 'Email address', value: admission.next_of_kin_email },
              ],
            },
            {
              title: 'Student account',
              fields: [
                { label: 'Account status', value: profile.account_status || 'Active' },
                { label: 'Payment status', value: profile.payment_status || 'Not available' },
                { label: 'Student since', value: profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '' },
                { label: 'Portal email', value: profile.email },
              ],
            },
          ],
          verifications,
        };
      }, mode);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to prepare your profile PDF.');
    } finally {
      setExporting(null);
    }
  };

  useEffect(() => {
    let active = true;
    (api.students.myProfile() as Promise<ProfileResponse>)
      .then((response) => {
        if (active) setProfile(response.data.student);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load your profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !profile) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WEBP image for your profile photo.');
      setNotice('');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Choose a profile photo smaller than 5 MB.');
      setNotice('');
      return;
    }

    setUploading(true);
    setError('');
    setNotice('');
    try {
      const response = await api.students.uploadMyAvatar(file) as AvatarResponse;
      setProfile((current) => current ? { ...current, avatar: response.data.avatar } : current);
      setNotice('Your profile photo has been updated.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to upload your profile photo.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <main className="mx-auto max-w-5xl"><div className="flex min-h-64 items-center justify-center gap-3 text-sm font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading your student profile...</div></main>;
  if (error && !profile) return <main className="mx-auto max-w-5xl"><div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div></main>;
  if (!profile) return <main className="mx-auto max-w-5xl"><div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Student profile is unavailable.</div></main>;

  const admission = profile.admission;
  const avatarSrc = profile.avatar ? assetUrl(profile.avatar) : '';

  return (
    <main className="mx-auto max-w-8xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-900">Student record</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">My profile</h1>
          <p className="mt-1 text-sm text-slate-500">Your personal, academic, and student account details.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void exportProfile('view')} disabled={exporting !== null} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60">
            {exporting === 'view' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}View profile PDF
          </button>
          <button type="button" onClick={() => void exportProfile('download')} disabled={exporting !== null} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60">
            {exporting === 'download' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Download profile PDF
          </button>
        </div>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div>}

      <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-10 text-center text-white shadow-lg sm:py-12">
        <div aria-hidden="true" className="absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10" />
        <div aria-hidden="true" className="absolute -bottom-36 -left-20 h-72 w-72 rounded-full border border-amber-400/20" />
        <div className="relative mx-auto flex max-w-xl flex-col items-center">
          <div className="relative">
            {avatarSrc ? (
              <div role="img" aria-label={`${profile.name} profile photo`} className="h-32 w-32 rounded-full border-4 border-white/90 bg-cover bg-center shadow-xl ring-4 ring-amber-400/40" style={{ backgroundImage: `url("${avatarSrc.replaceAll('"', '%22')}")` }} />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white/90 bg-blue-900 text-4xl font-black uppercase shadow-xl ring-4 ring-amber-400/40">
                {profile.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('')}
              </div>
            )}
            <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="absolute bottom-0 right-0 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-950 bg-amber-400 text-slate-950 shadow-lg transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-70" aria-label="Upload a profile photo">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            </button>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadAvatar(event)} className="sr-only" aria-label="Choose a JPG, PNG, or WEBP profile photo" />
          </div>
          <h2 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">{profile.name}</h2>
          <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-xs font-bold tracking-wide text-slate-200"><IdCard className="h-4 w-4 text-amber-400" />{profile.student_id}</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-amber-300">{profile.class || 'Cohort not assigned'}{admission.program ? ` · ${admission.program}` : ''}</p>
          <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="mt-5 text-xs font-bold text-slate-300 underline decoration-slate-500 underline-offset-4 transition hover:text-white disabled:opacity-60">
            {uploading ? 'Uploading photo...' : profile.avatar ? 'Change profile photo' : 'Upload profile photo'}
          </button>
          <p className="mt-2 text-[10px] text-slate-400">JPG, PNG, or WEBP · up to 5 MB</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Student overview">
        {[
          { label: 'Cohort', value: profile.class || 'Unassigned', icon: GraduationCap },
          { label: 'Active courses', value: profile.active_courses, icon: BookOpen },
          { label: 'Attendance records', value: profile.attendance.records, icon: CalendarDays },
          { label: 'Account status', value: profile.account_status || 'Active', icon: ShieldCheck },
        ].map((item) => {
          const Icon = item.icon;
          return <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p><span className="rounded-lg bg-blue-50 p-2 text-blue-900"><Icon className="h-4 w-4" /></span></div>
            <p className="mt-4 text-xl font-black tracking-tight text-slate-950">{item.value}</p>
            {item.label === 'Attendance records' && <p className="mt-1 text-[10px] text-slate-400">Student check-ins recorded</p>}
          </article>;
        })}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <ProfileSection title="Personal details" description="Identity and contact information on your student record." icon={<UserRound className="h-5 w-5" />}>
          <ProfileField label="Full name" value={profile.name} icon={<UserRound className="h-3.5 w-3.5" />} />
          <ProfileField label="Email address" value={profile.email} icon={<Mail className="h-3.5 w-3.5" />} />
          <ProfileField label="Phone number" value={admission.phone} icon={<Phone className="h-3.5 w-3.5" />} />
          <ProfileField label="Date of birth" value={admission.date_of_birth} icon={<CalendarDays className="h-3.5 w-3.5" />} />
          <ProfileField label="Gender" value={admission.gender} />
          <ProfileField label="Nationality" value={admission.nationality} />
          <ProfileField label="Home address" value={admission.home_address} icon={<MapPin className="h-3.5 w-3.5" />} wide />
        </ProfileSection>

        <ProfileSection title="Academic details" description="Programme and current academic participation." icon={<GraduationCap className="h-5 w-5" />}>
          <ProfileField label="Student ID" value={profile.student_id} icon={<IdCard className="h-3.5 w-3.5" />} />
          <ProfileField label="Cohort" value={profile.class} icon={<UsersRound className="h-3.5 w-3.5" />} />
          <ProfileField label="Programme" value={admission.program} icon={<BookOpen className="h-3.5 w-3.5" />} />
          <ProfileField label="Intended start term" value={admission.start_term} />
          <ProfileField label="Previous/current school" value={admission.current_school} />
          <ProfileField label="Qualifications" value={admission.qualifications} wide />
          <ProfileField label="Active courses" value={profile.active_courses} />
          <ProfileField label="Attendance records" value={profile.attendance.records} />
        </ProfileSection>

        <ProfileSection title="Parent or guardian" description="Contact information supplied during admission." icon={<Heart className="h-5 w-5" />}>
          <ProfileField label="Name" value={admission.guardian_name} icon={<UserRound className="h-3.5 w-3.5" />} />
          <ProfileField label="Relationship" value={admission.guardian_relation} />
          <ProfileField label="Phone number" value={admission.guardian_phone} icon={<Phone className="h-3.5 w-3.5" />} />
          <ProfileField label="Email address" value={admission.guardian_email} icon={<Mail className="h-3.5 w-3.5" />} />
        </ProfileSection>

        <ProfileSection title="Next of kin" description="Your nominated emergency contact." icon={<UsersRound className="h-5 w-5" />}>
          <ProfileField label="Name" value={admission.next_of_kin_name} icon={<UserRound className="h-3.5 w-3.5" />} />
          <ProfileField label="Relationship" value={admission.next_of_kin_relation} />
          <ProfileField label="Phone number" value={admission.next_of_kin_phone} icon={<Phone className="h-3.5 w-3.5" />} />
          <ProfileField label="Email address" value={admission.next_of_kin_email} icon={<Mail className="h-3.5 w-3.5" />} />
        </ProfileSection>

        <ProfileSection title="Student account" description="Administrative account details." icon={<ShieldCheck className="h-5 w-5" />}>
          <ProfileField label="Account status" value={profile.account_status || 'Active'} />
          <ProfileField label="Payment status" value={profile.payment_status || 'Not available'} />
          <ProfileField label="Student since" value={profile.created_at ? new Date(profile.created_at).toLocaleDateString() : ''} icon={<CalendarDays className="h-3.5 w-3.5" />} />
          <ProfileField label="Portal email" value={profile.email} icon={<Mail className="h-3.5 w-3.5" />} />
        </ProfileSection>

        <ProfileSection title="Address" description="Residential contact details." icon={<Home className="h-5 w-5" />}>
          <ProfileField label="Home address" value={admission.home_address} icon={<MapPin className="h-3.5 w-3.5" />} wide />
          <ProfileField label="Nationality" value={admission.nationality} />
        </ProfileSection>
      </div>

      <p className="text-center text-xs text-slate-500">For corrections to your personal or academic records, please contact the school administration.</p>
    </main>
  );
}
