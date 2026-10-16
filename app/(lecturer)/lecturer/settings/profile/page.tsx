'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import {
  Building, Camera, CheckCircle2, Eye, EyeOff, Fingerprint, Globe,
  Key, Lock, Mail, MapPin, Phone, RotateCcw, Save, ShieldCheck,
  User, UserRound,
} from 'lucide-react';
import { api, assetUrl } from '@/lib/api';

type LecturerProfile = {
  employee_number: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
  title: string;
  avatar: string;
  office_location: string;
  bio: string;
  timezone: string;
  account_status: string;
  profile_status: string;
  last_login_at: string | null;
};

type ProfileResponse = { success?: boolean; data?: LecturerProfile };
type ProfileTab = 'profile' | 'credentials';

const emptyProfile: LecturerProfile = {
  employee_number: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  department: '',
  title: '',
  avatar: '',
  office_location: '',
  bio: '',
  timezone: 'Africa/Accra',
  account_status: '',
  profile_status: '',
  last_login_at: null,
};

export default function LecturerProfileSettingsPage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
  const [profile, setProfile] = useState<LecturerProfile>(emptyProfile);
  const [savedProfile, setSavedProfile] = useState<LecturerProfile>(emptyProfile);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    (api.lecturerProfile() as Promise<ProfileResponse>)
      .then((response) => {
        if (!response.data) throw new Error('The lecturer profile response was incomplete.');
        if (!active) return;
        const loaded = { ...emptyProfile, ...response.data };
        setProfile(loaded);
        setSavedProfile(loaded);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load your lecturer profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const updateField = (field: keyof LecturerProfile, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setError('');
    setNotice('');
  };

  const updateProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await api.updateLecturerProfile(profile) as { message?: string; data?: LecturerProfile };
      if (!response.data) throw new Error('The saved profile response was incomplete.');
      const saved = { ...emptyProfile, ...response.data };
      setProfile(saved);
      setSavedProfile(saved);
      window.dispatchEvent(new CustomEvent('rhema-lecturer-profile-updated', {
        detail: {
          name: `${saved.first_name} ${saved.last_name}`.trim(),
          email: saved.email,
          department: saved.department,
          title: saved.title,
        },
      }));
      setNotice(response.message || 'Your profile was updated.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your lecturer profile.');
    } finally {
      setSaving(false);
    }
  };

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (newPassword !== confirmPassword) {
      setError('The new password and confirmation do not match.');
      return;
    }
    setSaving(true);
    try {
      const response = await api.changeLecturerPassword({
        current_password: currentPassword,
        new_password: newPassword,
      }) as { message?: string };
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice(response.message || 'Your password was changed.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to change your password.');
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setNotice('');
    setUploadingAvatar(true);
    try {
      const response = await api.uploadLecturerAvatar(file) as { message?: string; data?: { avatar: string } };
      const avatar = response.data?.avatar;
      if (!avatar) throw new Error('The uploaded photo was not saved to your profile.');
      const updated = { ...profile, avatar };
      setProfile(updated);
      setSavedProfile(updated);
      setNotice(response.message || 'Profile photo updated.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to upload your profile photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const revertChanges = () => {
    setError('');
    setNotice('');
    if (activeTab === 'profile') {
      setProfile(savedProfile);
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const initials = `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase() || 'L';
  const isActive = profile.account_status === 'active' && profile.profile_status === 'Active';

  return (
    <div className="mx-auto max-w-8xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="mb-1 text-[10px] font-mono font-black uppercase tracking-widest text-blue-900">
            {activeTab === 'profile' ? 'Identity Node' : 'Security Vault'}
          </div>
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
            {activeTab === 'profile' ? 'Faculty Profile Settings' : 'Credentials & Passwords'}
          </h1>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            {activeTab === 'profile'
              ? 'Manage your academic identity and contact details.'
              : 'Change your lecturer portal password securely.'}
          </p>
        </div>
        {notice && (
          <div role="status" className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-mono font-black uppercase text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> {notice}
          </div>
        )}
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800">{error}</div>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <aside className="space-y-4 md:col-span-1">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-2xs">
            <div className="group relative mx-auto h-28 w-28">
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-100 text-3xl font-black tracking-tighter text-blue-900">
                {profile.avatar ? (
                  <div
                    role="img"
                    aria-label="Lecturer profile photo"
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url("${assetUrl(profile.avatar)}")` }}
                  />
                ) : initials}
              </div>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadAvatar(event)} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || uploadingAvatar}
                aria-label={uploadingAvatar ? 'Uploading profile photo' : 'Change profile photo'}
                className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-2xl bg-slate-950/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100 disabled:cursor-not-allowed"
              >
                <Camera className="h-5 w-5 text-amber-400" />
              </button>
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-900">{profile.title ? `${profile.title} ` : ''}{profile.first_name} {profile.last_name}</h2>
              <p className="mt-0.5 font-mono text-[11px] font-semibold text-slate-400">{profile.email || 'No email recorded'}</p>
              {uploadingAvatar && <p className="mt-2 text-[10px] font-bold text-blue-800">Uploading photo...</p>}
            </div>
            <div className="flex items-center justify-center gap-1.5 border-t border-slate-100 pt-3 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
              <ShieldCheck className={`h-4 w-4 ${isActive ? 'text-emerald-600' : 'text-amber-600'}`} />
              {loading ? 'Checking lecturer status' : isActive ? 'Active lecturer account' : 'Account inactive'}
            </div>
            {profile.employee_number && <p className="text-[10px] font-mono text-slate-400">Employee no. {profile.employee_number}</p>}
          </div>

          <div className="space-y-0.5 rounded-2xl border border-slate-200 bg-slate-50 p-2">
            <button
              type="button"
              onClick={() => { setActiveTab('profile'); setError(''); setNotice(''); }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-all ${activeTab === 'profile' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <User className={`h-4 w-4 ${activeTab === 'profile' ? 'text-amber-400' : 'text-slate-400'}`} /> Public Credentials
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('credentials'); setError(''); setNotice(''); }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-all ${activeTab === 'credentials' ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Lock className={`h-4 w-4 ${activeTab === 'credentials' ? 'text-amber-400' : 'text-slate-400'}`} /> Credentials &amp; Password
            </button>
          </div>
        </aside>

        <div className="space-y-6 md:col-span-2">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs font-semibold text-slate-500">
              Loading your lecturer profile...
            </div>
          ) : activeTab === 'profile' ? (
            <form onSubmit={updateProfile} className="space-y-6">
              <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                <SectionHeading icon={<UserRound className="h-4 w-4 text-blue-900" />} title="Core Academic Identity" description="Update the information stored in your lecturer record." />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ProfileField label="Official First Name" icon={<User className="h-4 w-4" />} wide>
                    <input required maxLength={120} value={profile.first_name} onChange={(event) => updateField('first_name', event.target.value)} className={inputClass} />
                  </ProfileField>
                  <ProfileField label="Official Last Name" icon={<User className="h-4 w-4" />}>
                    <input required maxLength={120} value={profile.last_name} onChange={(event) => updateField('last_name', event.target.value)} className={inputClass} />
                  </ProfileField>
                  <ProfileField label="Academic Routing Email" icon={<Mail className="h-4 w-4" />}>
                    <input required type="email" maxLength={254} value={profile.email} onChange={(event) => updateField('email', event.target.value)} className={inputClass} />
                  </ProfileField>
                  <ProfileField label="Primary Mobile Number" icon={<Phone className="h-4 w-4" />}>
                    <input type="tel" maxLength={60} value={profile.phone} onChange={(event) => updateField('phone', event.target.value)} className={inputClass} />
                  </ProfileField>
                  <ProfileField label="Assigned Faculty Department" icon={<Building className="h-4 w-4" />} wide>
                    <input maxLength={150} value={profile.department} onChange={(event) => updateField('department', event.target.value)} className={inputClass} />
                  </ProfileField>
                  <ProfileField label="Academic Title" icon={<UserRound className="h-4 w-4" />}>
                    <input maxLength={150} value={profile.title} onChange={(event) => updateField('title', event.target.value)} className={inputClass} />
                  </ProfileField>
                  <ProfileField label="Physical Office Location" icon={<MapPin className="h-4 w-4" />}>
                    <input maxLength={255} value={profile.office_location} onChange={(event) => updateField('office_location', event.target.value)} className={inputClass} />
                  </ProfileField>
                </div>
              </section>

              <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                <SectionHeading icon={<Globe className="h-4 w-4 text-blue-900" />} title="Professional Bio & Context Localization" description="Maintain your introduction and preferred timezone." />
                <div className="space-y-4">
                  <ProfileField label="Short Professional Statement" icon={<UserRound className="h-4 w-4" />}>
                    <textarea rows={4} maxLength={5000} value={profile.bio} onChange={(event) => updateField('bio', event.target.value)} className={`${inputClass} resize-y leading-relaxed`} />
                  </ProfileField>
                  <ProfileField label="System Synchronization Timezone" icon={<Globe className="h-4 w-4" />}>
                    <select value={profile.timezone} onChange={(event) => updateField('timezone', event.target.value)} className={inputClass}>
                      <option value="Africa/Accra">Africa/Accra (GMT+0)</option>
                      <option value="Africa/Lusaka">Africa/Lusaka (GMT+2)</option>
                      <option value="Africa/Johannesburg">Africa/Johannesburg (GMT+2)</option>
                      <option value="UTC">Coordinated Universal Time (UTC)</option>
                    </select>
                  </ProfileField>
                </div>
              </section>

              <ActionBar saving={saving} onRevert={revertChanges} label="Save Profile" />
            </form>
          ) : (
            <form onSubmit={updatePassword} className="space-y-6">
              <section className="space-y-5 rounded-2xl border border-slate-900 bg-slate-950 p-5 text-white shadow-sm">
                <div className="flex items-start gap-4">
                  <Fingerprint className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                  <div className="w-full space-y-1">
                    <p className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-400">Lecturer Account Status</p>
                    <p className="text-xs font-medium leading-relaxed text-slate-300">
                      Account: <span className="font-bold text-amber-400">{isActive ? 'Active' : 'Inactive'}</span>
                      {profile.last_login_at && <> · Last sign-in: <span className="text-slate-100">{new Date(`${profile.last_login_at.replace(' ', 'T')}Z`).toLocaleString()}</span></>}
                    </p>
                    <p className="pt-1 text-[10px] text-slate-400">Passwords are securely hashed. Your current password is required to set a new one.</p>
                  </div>
                </div>
              </section>

              <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                <SectionHeading icon={<Lock className="h-4 w-4 text-blue-900" />} title="Change Portal Password" description="Use a new password of at least 12 characters." />
                <div className="space-y-4">
                  <PasswordField label="Active Current Password" value={currentPassword} onChange={setCurrentPassword} visible={showCurrent} onToggle={() => setShowCurrent((value) => !value)} autoComplete="current-password" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <PasswordField label="Target New Password" value={newPassword} onChange={setNewPassword} visible={showNew} onToggle={() => setShowNew((value) => !value)} autoComplete="new-password" minLength={12} />
                    <PasswordField label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} visible={showConfirm} onToggle={() => setShowConfirm((value) => !value)} autoComplete="new-password" minLength={12} />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-blue-900" />
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">Account Email</h2>
                    <p className="mt-1 text-xs text-slate-500">Your sign-in email is managed with your academic identity.</p>
                    <p className="mt-1 text-xs font-bold text-slate-700">{profile.email}</p>
                  </div>
                </div>
              </section>

              <ActionBar saving={saving} onRevert={revertChanges} label="Update Password" password />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 outline-none transition-colors focus:border-slate-300 focus:ring-2 focus:ring-blue-900/10';

function SectionHeading({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
      {icon}
      <div>
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">{title}</h2>
        <p className="text-[10px] font-medium text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function ProfileField({ label, icon, wide, children }: { label: string; icon: ReactNode; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`block space-y-1.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="block text-[10px] font-mono font-black uppercase tracking-wider text-slate-400">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3.5 top-3 text-slate-400">{icon}</span>
        {typeof children === 'object' && children !== null
          ? <span className="block [&_input]:pl-10 [&_select]:pl-10 [&_textarea]:pl-10">{children}</span>
          : children}
      </span>
    </label>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  autoComplete: string;
  minLength?: number;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[10px] font-mono font-black uppercase tracking-wider text-slate-400">{label}</span>
      <span className="relative block">
        <input
          required
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={4096}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputClass} pr-10 font-mono`}
        />
        <button type="button" onClick={onToggle} aria-label={visible ? 'Hide password' : 'Show password'} className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700">
          {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </span>
    </label>
  );
}

function ActionBar({ saving, onRevert, label, password = false }: { saving: boolean; onRevert: () => void; label: string; password?: boolean }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-1 text-xs">
      <button type="button" onClick={onRevert} disabled={saving} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50">
        <RotateCcw className="h-3.5 w-3.5" /> Revert Changes
      </button>
      <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900 px-5 py-2 font-mono font-black uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-blue-800 disabled:opacity-50">
        {password ? <Lock className="h-3.5 w-3.5 text-amber-400" /> : <Save className="h-3.5 w-3.5 text-amber-400" />}
        {saving ? 'Saving...' : label}
      </button>
    </div>
  );
}
