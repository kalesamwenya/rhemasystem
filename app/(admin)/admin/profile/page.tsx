'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Cropper from 'react-easy-crop';
import {
  AlertCircle, BadgeCheck, Camera, CheckCircle2, Clock3, Eye, EyeOff,
  Globe, KeyRound, LoaderCircle, LockKeyhole, Mail, RotateCcw, Save,
  ShieldCheck, UserRound, X,
} from 'lucide-react';
import { api, assetUrl, clearAuthSession } from '@/lib/api';

type CropArea = { x: number; y: number; width: number; height: number };

type AdminProfileData = {
  id: string;
  name: string;
  email: string;
  employee_number: string | null;
  department: string;
  admin_role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
  phone: string;
  title: string;
  timezone: string;
  avatar: string;
  pending_email: string | null;
  pending_email_expires_at: string | null;
};

type ProfileTab = 'profile' | 'security';

const emptyProfile: AdminProfileData = {
  id: '',
  name: '',
  email: '',
  employee_number: null,
  department: '',
  admin_role: '',
  status: '',
  last_login_at: null,
  created_at: '',
  phone: '',
  title: '',
  timezone: 'Africa/Lusaka',
  avatar: '',
  pending_email: null,
  pending_email_expires_at: null,
};

const inputClass = 'mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-[#003da5] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#003da5] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#002d7a] disabled:cursor-not-allowed disabled:opacity-60';

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'A';
}

function formatRole(role: string) {
  return role.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return 'No sign-in recorded';
  const date = new Date(`${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function createCroppedAvatar(imageUrl: string, area: CropArea): Promise<File> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Your browser could not prepare the cropped profile photo.'));
        return;
      }

      context.drawImage(
        image,
        area.x,
        area.y,
        area.width,
        area.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('The cropped profile photo could not be created.'));
          return;
        }
        resolve(new File([blob], 'admin-avatar.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.9);
    };
    image.onerror = () => reject(new Error('The selected photo could not be opened for cropping.'));
    image.src = imageUrl;
  });
}

export default function AdminProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
  const [profile, setProfile] = useState<AdminProfileData>(emptyProfile);
  const [savedProfile, setSavedProfile] = useState<AdminProfileData>(emptyProfile);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarCropUrl, setAvatarCropUrl] = useState('');
  const [avatarCrop, setAvatarCrop] = useState({ x: 0, y: 0 });
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarCroppedArea, setAvatarCroppedArea] = useState<CropArea | null>(null);
  const [avatarCropOpen, setAvatarCropOpen] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!avatarCropUrl) return;
    return () => URL.revokeObjectURL(avatarCropUrl);
  }, [avatarCropUrl]);

  useEffect(() => {
    let active = true;
    (api.adminProfile() as Promise<{ data?: AdminProfileData }>)
      .then((response) => {
        if (!response.data) throw new Error('The account profile response was incomplete.');
        if (!active) return;
        const loaded = { ...emptyProfile, ...response.data };
        setProfile(loaded);
        setSavedProfile(loaded);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load your account settings.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const updateField = <Key extends 'name' | 'phone' | 'title' | 'timezone'>(field: Key, value: AdminProfileData[Key]) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setError('');
    setNotice('');
  };

  const notifyProfileUpdated = (updated: AdminProfileData) => {
    window.dispatchEvent(new CustomEvent('rhema-admin-profile-updated', {
      detail: { name: updated.name, avatar: updated.avatar },
    }));
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await api.updateAdminProfile({
        name: profile.name,
        phone: profile.phone,
        title: profile.title,
        timezone: profile.timezone,
      }) as { message?: string; data?: AdminProfileData };
      if (!response.data) throw new Error('The saved profile response was incomplete.');
      const updated = { ...emptyProfile, ...response.data };
      setProfile(updated);
      setSavedProfile(updated);
      notifyProfileUpdated(updated);
      setNotice(response.message || 'Your profile settings were saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your profile settings.');
    } finally {
      setSaving(false);
    }
  };

  const selectAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WEBP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Choose an image no larger than 5 MB.');
      return;
    }

    setAvatarCrop({ x: 0, y: 0 });
    setAvatarZoom(1);
    setAvatarCroppedArea(null);
    setAvatarCropUrl(URL.createObjectURL(file));
    setAvatarCropOpen(true);
    setError('');
    setNotice('');
  };

  const cancelAvatarCrop = () => {
    setAvatarCropOpen(false);
    setAvatarCropUrl('');
    setAvatarCroppedArea(null);
  };

  const applyAvatarCrop = async () => {
    if (!avatarCropUrl || !avatarCroppedArea) {
      setError('Position the photo in the square frame before applying the crop.');
      return;
    }

    setUploading(true);
    setError('');
    setNotice('');
    try {
      const croppedFile = await createCroppedAvatar(avatarCropUrl, avatarCroppedArea);
      const response = await api.uploadAdminAvatar(croppedFile) as { message?: string; data?: { avatar?: string } };
      if (!response.data?.avatar) throw new Error('The uploaded photo was not saved to your account.');
      const updated = { ...profile, avatar: response.data.avatar };
      setProfile(updated);
      setSavedProfile((current) => ({ ...current, avatar: response.data?.avatar || '' }));
      notifyProfileUpdated(updated);
      setNotice(response.message || 'Your profile photo was updated.');
      cancelAvatarCrop();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to upload your profile photo.');
    } finally {
      setUploading(false);
    }
  };

  const requestEmailChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await api.startAdminEmailChange({
        email: newEmail,
        current_password: emailPassword,
      }) as { message?: string };
      setEmailPassword('');
      setProfile((current) => ({ ...current, pending_email: newEmail, pending_email_expires_at: null }));
      setNewEmail('');
      setNotice(response.message || 'A verification email was sent to your new address.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to request an email change.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (newPassword !== confirmPassword) {
      setError('The new password and confirmation do not match.');
      return;
    }
    setSaving(true);
    try {
      const response = await api.changeAdminPassword({
        current_password: currentPassword,
        new_password: newPassword,
      }) as { message?: string };
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice(response.message || 'Your password was changed. Sign in again.');
      window.setTimeout(() => {
        clearAuthSession();
        router.replace('/admin/login');
      }, 1200);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to change your password.');
    } finally {
      setSaving(false);
    }
  };

  const revertProfile = () => {
    setProfile(savedProfile);
    setError('');
    setNotice('');
  };

  const hasProfileChanges = profile.name !== savedProfile.name
    || profile.phone !== savedProfile.phone
    || profile.title !== savedProfile.title
    || profile.timezone !== savedProfile.timezone;
  const accountActive = profile.status === 'active';

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#c8102e]">Staff account</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">My account &amp; settings</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Manage your profile, sign-in email, password, and regional preferences.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
          <ShieldCheck className={`h-4 w-4 ${accountActive ? 'text-emerald-600' : 'text-amber-600'}`} />
          {loading ? 'Checking account' : accountActive ? 'Active account' : 'Account inactive'}
        </div>
      </header>

      {(error || notice) && (
        <div role={error ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {error ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          <p>{error || notice}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <div className="group relative mx-auto h-28 w-28">
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 text-2xl font-black text-[#003da5]">
                {profile.avatar ? (
                  <div
                    role="img"
                    aria-label={`${profile.name} profile photo`}
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url("${assetUrl(profile.avatar)}")` }}
                  />
                ) : initials(profile.name)}
              </div>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={selectAvatar} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || uploading}
                aria-label={uploading ? 'Uploading profile photo' : 'Change profile photo'}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/45 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed"
              >
                {uploading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              </button>
            </div>
            <p className="mt-4 text-base font-black text-slate-900">{profile.name || 'Staff member'}</p>
            <p className="mt-1 break-all font-mono text-xs text-slate-500">{profile.email || 'Loading account email…'}</p>
            {profile.employee_number && <p className="mt-2 text-[11px] font-semibold text-slate-500">Employee no. {profile.employee_number}</p>}
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 text-left">
              <div className="rounded-lg bg-slate-50 p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Role</p>
                <p className="mt-1 text-xs font-bold text-slate-800">{profile.admin_role ? formatRole(profile.admin_role) : '—'}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Department</p>
                <p className="mt-1 truncate text-xs font-bold text-slate-800" title={profile.department}>{profile.department || '—'}</p>
              </div>
            </div>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <Clock3 className="h-3.5 w-3.5" /> Last sign-in: {formatDate(profile.last_login_at)}
            </p>
          </section>

          <nav aria-label="Account settings" className="space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <button type="button" onClick={() => { setActiveTab('profile'); setError(''); setNotice(''); }} className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-bold ${activeTab === 'profile' ? 'bg-blue-50 text-[#003da5]' : 'text-slate-600 hover:bg-slate-50'}`}>
              <UserRound className="h-4 w-4" /> Profile &amp; preferences
            </button>
            <button type="button" onClick={() => { setActiveTab('security'); setError(''); setNotice(''); }} className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-bold ${activeTab === 'security' ? 'bg-blue-50 text-[#003da5]' : 'text-slate-600 hover:bg-slate-50'}`}>
              <LockKeyhole className="h-4 w-4" /> Sign-in &amp; security
            </button>
          </nav>
          <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            Your department, role, and account status are managed by authorized staff in <Link href="/admin/staff-access" className="font-bold text-[#003da5] underline">Staff Access</Link>.
          </p>
        </aside>

        <div className="space-y-5">
          {loading ? (
            <div role="status" className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading your account settings…</div>
          ) : activeTab === 'profile' ? (
            <form onSubmit={(event) => void saveProfile(event)} className="space-y-5">
              <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <h2 className="text-base font-black text-slate-900">Personal details</h2>
                  <p className="mt-1 text-sm text-slate-500">Update the name and contact details shown in your staff account.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                    Full name
                    <input required maxLength={160} autoComplete="name" value={profile.name} onChange={(event) => updateField('name', event.target.value)} className={inputClass} />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Job title
                    <input maxLength={150} value={profile.title} onChange={(event) => updateField('title', event.target.value)} className={inputClass} placeholder="Optional" />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Phone number
                    <input type="tel" maxLength={60} autoComplete="tel" value={profile.phone} onChange={(event) => updateField('phone', event.target.value)} className={inputClass} placeholder="Optional" />
                  </label>
                  <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                    Sign-in email
                    <input value={profile.email} readOnly className={inputClass} />
                    <span className="mt-1 block font-normal text-slate-500">Change and verify this address in Sign-in &amp; security.</span>
                  </label>
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <Globe className="mt-0.5 h-5 w-5 text-[#003da5]" />
                  <div>
                    <h2 className="text-base font-black text-slate-900">Regional preferences</h2>
                    <p className="mt-1 text-sm text-slate-500">Choose the timezone used for account date and time displays.</p>
                  </div>
                </div>
                <label className="block max-w-md text-xs font-bold text-slate-700">
                  Timezone
                  <select value={profile.timezone} onChange={(event) => updateField('timezone', event.target.value)} className={inputClass}>
                    <option value="Africa/Lusaka">Africa/Lusaka (CAT, UTC+2)</option>
                    <option value="Africa/Accra">Africa/Accra (GMT, UTC+0)</option>
                    <option value="Africa/Johannesburg">Africa/Johannesburg (SAST, UTC+2)</option>
                    <option value="UTC">Coordinated Universal Time (UTC)</option>
                  </select>
                </label>
              </section>

              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={revertProfile} disabled={!hasProfileChanges || saving} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  <RotateCcw className="h-4 w-4" /> Discard changes
                </button>
                <button type="submit" disabled={!hasProfileChanges || saving} className={buttonClass}>
                  {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save profile
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 text-[#003da5]" />
                  <div>
                    <h2 className="text-base font-black text-slate-900">Change sign-in email</h2>
                    <p className="mt-1 text-sm leading-5 text-slate-500">We will send a verification link and a one-time code to the new address. Your current email stays active until verification succeeds.</p>
                  </div>
                </div>
                {profile.pending_email && (
                  <div role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <MailCheckIcon />
                    <p>
                      Verification is pending for <strong>{profile.pending_email}</strong>.
                      {profile.pending_email_expires_at
                        ? ` The link expires ${formatDate(profile.pending_email_expires_at)}.`
                        : ' The link and code expire after 10 minutes.'}
                    </p>
                  </div>
                )}
                <form onSubmit={(event) => void requestEmailChange(event)} className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-bold text-slate-700">
                    New email address
                    <input required type="email" maxLength={254} autoComplete="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} className={inputClass} />
                  </label>
                  <label className="text-xs font-bold text-slate-700">
                    Confirm with current password
                    <input required type="password" autoComplete="current-password" value={emailPassword} onChange={(event) => setEmailPassword(event.target.value)} className={inputClass} />
                  </label>
                  <div className="sm:col-span-2">
                    <button type="submit" disabled={saving || !newEmail || !emailPassword} className={buttonClass}>
                      {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MailCheckIcon />} Send verification email
                    </button>
                  </div>
                </form>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <KeyRound className="mt-0.5 h-5 w-5 text-[#003da5]" />
                  <div>
                    <h2 className="text-base font-black text-slate-900">Change password</h2>
                    <p className="mt-1 text-sm leading-5 text-slate-500">Use at least 12 characters. Your current password is required, and all active sessions will be signed out after the change.</p>
                  </div>
                </div>
                <form onSubmit={(event) => void changePassword(event)} className="mt-4 space-y-4">
                  <label className="block text-xs font-bold text-slate-700">
                    Current password
                    <span className="relative mt-1.5 block">
                      <input required type={showPasswords ? 'text' : 'password'} autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={`${inputClass} pr-12`} />
                      <button type="button" onClick={() => setShowPasswords((value) => !value)} aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100">
                        {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </span>
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-bold text-slate-700">
                      New password
                      <input required minLength={12} maxLength={4096} type={showPasswords ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={inputClass} />
                    </label>
                    <label className="text-xs font-bold text-slate-700">
                      Confirm new password
                      <input required minLength={12} maxLength={4096} type={showPasswords ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} />
                    </label>
                  </div>
                  <button type="submit" disabled={saving || !currentPassword || !newPassword || !confirmPassword} className={buttonClass}>
                    {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />} Update password
                  </button>
                </form>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Account access</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-600">Role: {formatRole(profile.admin_role)} · Department: {profile.department || 'Not assigned'} · Status: {formatRole(profile.status)}.</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">Access level and account status are managed separately by authorized staff. See <Link href="/admin/staff-access" className="font-bold text-[#003da5] underline">Staff Access</Link>.</p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {avatarCropOpen && avatarCropUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="avatar-crop-title" className="my-auto w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="avatar-crop-title" className="text-lg font-black text-slate-950">Crop profile photo</h2>
                <p className="mt-1 text-sm text-slate-600">Move and zoom the photo to fit the square avatar frame.</p>
              </div>
              <button type="button" onClick={cancelAvatarCrop} disabled={uploading} aria-label="Cancel photo crop" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            <div className="relative mt-4 h-[min(60vh,420px)] overflow-hidden rounded-xl bg-slate-950">
              <Cropper
                image={avatarCropUrl}
                crop={avatarCrop}
                zoom={avatarZoom}
                aspect={1}
                onCropChange={setAvatarCrop}
                onZoomChange={setAvatarZoom}
                onCropComplete={(_, area) => setAvatarCroppedArea(area)}
              />
            </div>
            <label className="mt-5 block text-sm font-bold text-slate-700">
              Zoom
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={avatarZoom}
                onChange={(event) => setAvatarZoom(Number(event.target.value))}
                className="mt-2 w-full accent-[#003da5]"
              />
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={cancelAvatarCrop} disabled={uploading} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                Cancel
              </button>
              <button type="button" onClick={() => void applyAvatarCrop()} disabled={uploading || !avatarCroppedArea} className={buttonClass}>
                {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {uploading ? 'Uploading…' : 'Crop and upload'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function MailCheckIcon() {
  return <Mail className="mt-0.5 h-4 w-4 shrink-0" />;
}
