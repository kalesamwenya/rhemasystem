'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { ImagePlus, LoaderCircle, X } from 'lucide-react';
import { api, assetUrl } from '@/lib/api';
import {
  MANAGED_PAGE_FIELDS,
  loadAllManagedPageContent,
  loadAboutContent,
  type AboutContent,
  type AboutPageContent,
  type AboutPerson,
  type AboutTestimonial,
  type AvailableTeamProfile,
  type FacultyMember,
  type ManagedPageContent,
  type ManagedPageField,
  type ManagedPageKey,
  type PublicCourse,
  type TestimonySubmission,
} from '@/lib/public-site-content';

type ContentResponse = { success: boolean; message?: string; data?: { testimonial_id?: number | null } };
type ContentTab = 'about' | 'team' | 'faculty' | 'testimonies' | 'submissions' | 'public-courses' | ManagedPageKey;

type TeamDraft = Omit<AboutPerson, 'id'>;
type FacultyDraft = Omit<FacultyMember, 'id'>;
type TestimonyDraft = Omit<AboutTestimonial, 'id'>;
type PublicCourseDraft = Omit<PublicCourse, 'id'> & { id?: number };

const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-red-400';
const emptyContent: AboutContent = {
  hero_badge: '',
  hero_title: '',
  hero_description: '',
  hero_image: '',
  home_hero_badge: '',
  home_hero_title: '',
  home_hero_description: '',
  home_hero_image: '',
  life_badge: '',
  life_title: '',
  life_description: '',
  life_card_1_title: '',
  life_card_1_description: '',
  life_card_1_image: '',
  life_card_1_link_label: '',
  life_card_1_link_url: '',
  life_card_2_title: '',
  life_card_2_description: '',
  life_card_2_image: '',
  life_card_2_link_label: '',
  life_card_2_link_url: '',
  life_card_3_title: '',
  life_card_3_description: '',
  life_card_3_image: '',
  life_card_3_link_label: '',
  life_card_3_link_url: '',
  story_title: '',
  story_text: '',
  mission_title: '',
  mission_text: '',
  vision_title: '',
  vision_text: '',
  faith_title: '',
  faith_text: '',
  heritage_title: '',
  heritage_text: '',
  motto_title: '',
  motto_text: '',
  community_title: '',
  community_text: '',
  values_title: '',
  values_description: '',
  value_1_title: '',
  value_1_text: '',
  value_2_title: '',
  value_2_text: '',
  value_3_title: '',
  value_3_text: '',
  value_4_title: '',
  value_4_text: '',
};
const emptyTeam: TeamDraft = { name: '', role: '', bio: '', avatar_url: '', source_type: 'manual', source_id: null, sort_order: 0, is_published: 1 };
const emptyFaculty: FacultyDraft = { name: '', role: '', bio: '', avatar_url: '', sort_order: 0, is_published: 1 };
const emptyTestimony: TestimonyDraft = { author_name: '', author_role: '', quote_text: '', avatar_url: '', sort_order: 0, is_published: 1 };
const emptyPublicCourse: PublicCourseDraft = {
  course: '',
  description: '',
  cohort: 1,
  cohortName: 'First year',
  sort_order: 0,
  is_published: 1,
};
const managedPageTabs: { key: ManagedPageKey; label: string }[] = [
  { key: 'admissions', label: 'Admissions' },
  { key: 'contact', label: 'Contact + footer' },
  { key: 'community', label: 'Community' },
  { key: 'academics', label: 'Academics' },
  { key: 'fees', label: 'Fees' },
  { key: 'privacy', label: 'Privacy' },
  { key: 'terms', label: 'Terms' },
];

function Field({
  label,
  value,
  onChange,
  multiline = false,
  required = false,
  type = 'text',
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  required?: boolean;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block text-xs font-bold text-slate-600">
      {label}
      {multiline ? (
        <textarea required={required} value={value} onChange={(event) => onChange(event.target.value)} rows={4} className={inputClass} />
      ) : (
        <input required={required} disabled={disabled} type={type} value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500`} />
      )}
    </label>
  );
}

function ImageField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const upload = async (file?: File) => {
    if (!file) return;
    setUploadError('');
    setIsUploading(true);
    try {
      const response = await api.uploads.image(file, 'site-content') as {
        success: boolean;
        message?: string;
        data?: { path?: string };
      };
      if (!response.success || !response.data?.path) {
        throw new Error(response.message ?? 'The uploaded image path was not returned.');
      }
      onChange(response.data.path);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Unable to upload image.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-slate-600">
        {label}
        <input
          type="text"
          value={value}
          disabled={disabled || isUploading}
          onChange={(event) => { onChange(event.target.value); setUploadError(''); }}
          placeholder="Paste an image URL or upload an image"
          className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500`}
        />
      </label>
      {value && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
          <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-white">
            <Image src={assetUrl(value)} alt={`${label} preview`} fill unoptimized sizes="112px" className="object-cover" />
          </div>
          <p className="min-w-0 flex-1 truncate text-xs text-slate-500">{value}</p>
          <button
            type="button"
            disabled={disabled || isUploading}
            onClick={() => { onChange(''); setUploadError(''); }}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-200 px-2.5 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <X size={14} /> Remove
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 ${disabled || isUploading ? 'pointer-events-none opacity-50' : ''}`}>
          {isUploading ? <LoaderCircle size={15} className="animate-spin" /> : <ImagePlus size={15} />}
          {isUploading ? 'Uploading image...' : value ? 'Replace image' : 'Upload image'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={disabled || isUploading}
            className="sr-only"
            onChange={(event) => {
              void upload(event.currentTarget.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
        </label>
        <span className="text-xs text-slate-500">JPG, PNG, WEBP, or GIF · up to 8 MB</span>
      </div>
      {uploadError && <p role="alert" className="text-xs font-semibold text-red-700">{uploadError}</p>}
    </div>
  );
}

function TextPair({
  title,
  text,
  titleValue,
  textValue,
  onTitleChange,
  onTextChange,
}: {
  title: string;
  text: string;
  titleValue: string;
  textValue: string;
  onTitleChange: (value: string) => void;
  onTextChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label={title} value={titleValue} onChange={onTitleChange} required />
      <Field label={text} value={textValue} onChange={onTextChange} multiline required />
    </div>
  );
}

export default function WebsiteContentPage() {
  const [activeTab, setActiveTab] = useState<ContentTab>('about');
  const [content, setContent] = useState<AboutContent>(emptyContent);
  const [managedPages, setManagedPages] = useState<Record<ManagedPageKey, ManagedPageContent> | null>(null);
  const [team, setTeam] = useState<AboutPerson[]>([]);
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [availablePeople, setAvailablePeople] = useState<AvailableTeamProfile[]>([]);
  const [testimonies, setTestimonies] = useState<AboutTestimonial[]>([]);
  const [submissions, setSubmissions] = useState<TestimonySubmission[]>([]);
  const [publicCourses, setPublicCourses] = useState<PublicCourse[]>([]);
  const [publicCourseDraft, setPublicCourseDraft] = useState<PublicCourseDraft>(emptyPublicCourse);
  const [teamDraft, setTeamDraft] = useState<TeamDraft>(emptyTeam);
  const [facultyDraft, setFacultyDraft] = useState<FacultyDraft>(emptyFaculty);
  const [testimonyDraft, setTestimonyDraft] = useState<TestimonyDraft>(emptyTestimony);
  const [inviteEmail, setInviteEmail] = useState('');
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [editingFacultyId, setEditingFacultyId] = useState<number | null>(null);
  const [editingTestimonyId, setEditingTestimonyId] = useState<number | null>(null);
  const [editingPublicCourseId, setEditingPublicCourseId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async (): Promise<AboutPageContent> => {
    const [data, pages, courses]: [AboutPageContent, Record<ManagedPageKey, ManagedPageContent>, { data?: PublicCourse[] }] = await Promise.all([
      loadAboutContent(true),
      loadAllManagedPageContent(),
      api.courses.adminPublicList(),
    ]);
    if (!Array.isArray(courses.data)) throw new Error('The public course catalog returned invalid data.');
    if (!data.content) throw new Error('About content is not initialized. Use site-content/createAboutContentTables.sql for a fresh database or site-content/upgradeAboutContentFields.sql for an existing database.');
    setContent({ ...emptyContent, ...data.content });
    setManagedPages(pages);
    setTeam(data.team);
    setFaculty(data.faculty);
    setTestimonies(data.testimonials);
    setAvailablePeople(data.available_people ?? []);
    setSubmissions(data.submissions ?? []);
    setPublicCourses(courses.data);
    setHasLoaded(true);
    return data;
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([loadAboutContent(true), loadAllManagedPageContent(), api.courses.adminPublicList()])
      .then(([data, pages, courses]: [AboutPageContent, Record<ManagedPageKey, ManagedPageContent>, { data?: PublicCourse[] }]) => {
        if (!active) return;
        if (!Array.isArray(courses.data)) throw new Error('The public course catalog returned invalid data.');
        if (!data.content) throw new Error('About content is not initialized. Use site-content/createAboutContentTables.sql for a fresh database or site-content/upgradeAboutContentFields.sql for an existing database.');
        setContent({ ...emptyContent, ...data.content });
        setManagedPages(pages);
        setTeam(data.team);
        setFaculty(data.faculty);
        setTestimonies(data.testimonials);
        setAvailablePeople(data.available_people ?? []);
        setSubmissions(data.submissions ?? []);
        setPublicCourses(courses.data);
        setHasLoaded(true);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load website content.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  const updateContent = (field: keyof AboutContent, value: string) => {
    setContent((current) => ({ ...current, [field]: value }));
  };

  const saveContent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await api.siteContent.saveAbout(content) as ContentResponse;
      if (!response.success) throw new Error(response.message ?? 'Unable to save about page content.');
      setNotice(response.message ?? 'About page content saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save about page content.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveManagedPage = async (page: ManagedPageKey, event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!managedPages) return;
    setIsSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await api.siteContent.savePageContent({
        page,
        content: managedPages[page],
      }) as ContentResponse;
      if (!response.success) throw new Error(response.message ?? `Unable to save ${page} page content.`);
      setNotice(response.message ?? `${page} page content saved.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : `Unable to save ${page} page content.`);
    } finally {
      setIsSaving(false);
    }
  };

  const savePublicCourse = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await api.courses.savePublicCourse({
        ...publicCourseDraft,
        ...(editingPublicCourseId ? { id: editingPublicCourseId } : {}),
      }) as ContentResponse;
      if (!response.success) throw new Error(response.message ?? 'Unable to save public course.');
      await load();
      setPublicCourseDraft(emptyPublicCourse);
      setEditingPublicCourseId(null);
      setNotice(response.message ?? 'Public course saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save public course.');
    } finally {
      setIsSaving(false);
    }
  };

  const editPublicCourse = (course: PublicCourse) => {
    setPublicCourseDraft({
      id: course.id,
      course: course.course,
      description: course.description,
      cohort: course.cohort,
      cohortName: course.cohortName,
      sort_order: course.sort_order ?? 0,
      is_published: course.is_published ?? 1,
    });
    setEditingPublicCourseId(course.id);
    setError('');
    setNotice('');
  };

  const deletePublicCourse = async (course: PublicCourse) => {
    if (!window.confirm(`Remove "${course.course}" from the public course catalog?`)) return;
    setError('');
    setNotice('');
    try {
      const response = await api.courses.removePublicCourse(course.id) as ContentResponse;
      if (!response.success) throw new Error(response.message ?? 'Unable to remove public course.');
      await load();
      if (editingPublicCourseId === course.id) {
        setPublicCourseDraft(emptyPublicCourse);
        setEditingPublicCourseId(null);
      }
      setNotice(response.message ?? 'Public course removed.');
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to remove public course.');
    }
  };

  const savePerson = async (kind: 'team' | 'faculty' | 'testimonial', event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');
    setNotice('');
    try {
      const isTeam = kind === 'team';
      const isFaculty = kind === 'faculty';
      const recordId = isTeam ? editingTeamId : isFaculty ? editingFacultyId : editingTestimonyId;
      const draft = isTeam ? teamDraft : isFaculty ? facultyDraft : testimonyDraft;
      const response = await api.siteContent.savePerson({
        kind,
        ...(recordId ? { id: recordId } : {}),
        ...draft,
      }) as ContentResponse;
      if (!response.success) throw new Error(response.message ?? `Unable to save ${isTeam ? 'team member' : isFaculty ? 'faculty profile' : 'testimony'}.`);
      await load();
      if (isTeam) {
        setTeamDraft(emptyTeam);
        setEditingTeamId(null);
      } else if (isFaculty) {
        setFacultyDraft(emptyFaculty);
        setEditingFacultyId(null);
      } else {
        setTestimonyDraft(emptyTestimony);
        setEditingTestimonyId(null);
      }
      setNotice(response.message ?? (isTeam ? 'Team member saved.' : isFaculty ? 'Faculty profile saved.' : 'Testimony saved.'));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this record.');
    } finally {
      setIsSaving(false);
    }
  };

  const deletePerson = async (kind: 'team' | 'faculty' | 'testimonial', id: number) => {
    const label = kind === 'team' ? 'team member' : kind === 'faculty' ? 'faculty profile' : 'testimony';
    if (!window.confirm(`Delete this ${label}?`)) return;
    setError('');
    setNotice('');
    try {
      const response = await api.siteContent.deletePerson(kind, id) as ContentResponse;
      if (!response.success) throw new Error(response.message ?? `Unable to delete ${label}.`);
      await load();
      setNotice(response.message ?? `${label} deleted.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : `Unable to delete ${label}.`);
    }
  };

  const sendTestimonyInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsSendingInvite(true);
    try {
      const response = await api.siteContent.sendTestimonyInvite(inviteEmail.trim()) as ContentResponse;
      if (!response.success) throw new Error(response.message ?? 'Unable to send a private testimony invitation.');
      setInviteEmail('');
      setNotice(response.message ?? 'Private testimony invitation sent by email.');
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Unable to send a private testimony invitation.');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const reviewSubmission = async (submission: TestimonySubmission, action: 'add' | 'dismiss') => {
    const actionText = action === 'add' ? 'add this submission as an unpublished draft' : 'dismiss this submission';
    if (!window.confirm(`Are you sure you want to ${actionText}?`)) return;
    setIsSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await api.siteContent.reviewTestimonySubmission({ id: submission.id, action }) as ContentResponse;
      if (!response.success) throw new Error(response.message ?? 'Unable to review testimony submission.');
      const data = await load();
      if (action === 'add' && response.data?.testimonial_id) {
        const draft = data.testimonials.find((item) => item.id === response.data?.testimonial_id);
        if (draft) startTestimonyEdit(draft);
        setActiveTab('testimonies');
      }
      setNotice(response.message ?? 'Testimony submission reviewed.');
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Unable to review testimony submission.');
    } finally {
      setIsSaving(false);
    }
  };

  const startTeamEdit = (person: AboutPerson) => {
    setTeamDraft({
      name: person.name,
      role: person.role,
      bio: person.bio,
      avatar_url: person.avatar_url,
      source_type: person.source_type,
      source_id: person.source_id,
      sort_order: person.sort_order,
      is_published: person.is_published,
    });
    setEditingTeamId(person.id);
    setError('');
    setNotice('');
  };

  const startFacultyEdit = (person: FacultyMember) => {
    setFacultyDraft({
      name: person.name,
      role: person.role,
      bio: person.bio,
      avatar_url: person.avatar_url,
      sort_order: person.sort_order,
      is_published: person.is_published,
    });
    setEditingFacultyId(person.id);
    setError('');
    setNotice('');
  };

  const selectTeamSource = (value: string) => {
    if (value === 'manual') {
      setTeamDraft((current) => ({ ...current, source_type: 'manual', source_id: null }));
      return;
    }
    const [sourceType, sourceIdText] = value.split(':');
    const sourceId = Number(sourceIdText);
    const profile = availablePeople.find((person) => (person.source_type === 'lecturer' ? 'staff' : person.source_type) === sourceType && person.id === sourceId);
    if (!profile) return;
    setTeamDraft((current) => ({
      ...current,
      name: profile.name,
      role: profile.role,
      avatar_url: profile.avatar_url,
      source_type: profile.source_type === 'admin' ? 'admin' : 'staff',
      source_id: profile.id,
    }));
  };

  const linkedPeople = new Set(team.filter((person) => person.id !== editingTeamId && person.source_id !== null).map((person) => `${person.source_type}:${person.source_id}`));
  const selectablePeople = availablePeople.filter((person) => !linkedPeople.has(`${person.source_type === 'lecturer' ? 'staff' : person.source_type}:${person.id}`));
  const currentSourceKey = teamDraft.source_type === 'manual' || teamDraft.source_id === null ? 'manual' : `${teamDraft.source_type}:${teamDraft.source_id}`;
  const currentSourceUnavailable = currentSourceKey !== 'manual'
    && !availablePeople.some((person) => `${person.source_type === 'lecturer' ? 'staff' : person.source_type}:${person.id}` === currentSourceKey);

  const startTestimonyEdit = (testimony: AboutTestimonial) => {
    setTestimonyDraft({
      author_name: testimony.author_name,
      author_role: testimony.author_role,
      quote_text: testimony.quote_text,
      avatar_url: testimony.avatar_url,
      sort_order: testimony.sort_order,
      is_published: testimony.is_published,
    });
    setEditingTestimonyId(testimony.id);
    setError('');
    setNotice('');
  };

  const retryLoad = async () => {
    setIsLoading(true);
    setError('');
    try {
      await load();
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load website content.');
    } finally {
      setIsLoading(false);
    }
  };
  const currentManagedPage = Object.prototype.hasOwnProperty.call(MANAGED_PAGE_FIELDS, activeTab)
    ? activeTab as ManagedPageKey
    : null;

  if (isLoading) return <p role="status" className="py-10 text-sm text-slate-600">Loading website content...</p>;
  if (!hasLoaded) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Website content</h1>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>}
        <button type="button" onClick={retryLoad} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">Communications & website</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Website content</h1>
        <p className="mt-1 text-sm text-slate-500">Manage public page copy, the public course catalog, staff team profiles, faculty profiles, and published testimonies.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}

      <nav className="flex flex-wrap gap-2" aria-label="Website content sections">
        {([
          ['about', 'Home + About pages'],
          ['team', 'Staff team'],
          ['faculty', 'Faculty'],
          ['testimonies', 'Testimonies'],
          ['submissions', `Submissions (${submissions.length})`],
          ['public-courses', 'Public courses'],
          ...managedPageTabs.map(({ key, label }) => [key, label] as const),
        ] as const).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => { setActiveTab(tab); setError(''); setNotice(''); }}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold ${activeTab === tab ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {activeTab === 'public-courses' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">Public curriculum catalog</h2>
              <p className="mt-1 text-sm text-slate-500">These entries are stored separately from academic courses and student enrollment. Only published entries appear on the public home and Academics pages.</p>
            </div>
            {publicCourses.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">No public courses are configured.</p>}
            {publicCourses.map((course) => (
              <article key={course.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">{course.course}</h3>
                  <p className="text-xs font-semibold text-blue-800">{course.cohortName || `Year ${course.cohort}`} · {course.is_published ? 'Published' : 'Hidden'} · order {course.sort_order ?? 0}</p>
                  {course.description && <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{course.description}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => editPublicCourse(course)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Edit</button>
                  <button type="button" onClick={() => void deletePublicCourse(course)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Remove</button>
                </div>
              </article>
            ))}
          </section>
          <form onSubmit={(event) => void savePublicCourse(event)} className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">{editingPublicCourseId ? 'Edit public course' : 'Add public course'}</h2>
            <Field label="Course name" value={publicCourseDraft.course} onChange={(value) => setPublicCourseDraft((current) => ({ ...current, course: value }))} required />
            <Field label="Description (optional)" value={publicCourseDraft.description} onChange={(value) => setPublicCourseDraft((current) => ({ ...current, description: value }))} multiline />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Year number" type="number" value={String(publicCourseDraft.cohort)} onChange={(value) => setPublicCourseDraft((current) => ({ ...current, cohort: Number(value) }))} required />
              <Field label="Year label" value={publicCourseDraft.cohortName} onChange={(value) => setPublicCourseDraft((current) => ({ ...current, cohortName: value }))} />
              <Field label="Display order within year" type="number" value={String(publicCourseDraft.sort_order ?? 0)} onChange={(value) => setPublicCourseDraft((current) => ({ ...current, sort_order: Number(value) }))} />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={publicCourseDraft.is_published === 1} onChange={(event) => setPublicCourseDraft((current) => ({ ...current, is_published: event.target.checked ? 1 : 0 }))} />
              Published on the public site
            </label>
            <div className="flex gap-2">
              <button disabled={isSaving} type="submit" className="rounded-xl bg-blue-800 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">{isSaving ? 'Saving...' : editingPublicCourseId ? 'Save changes' : 'Add public course'}</button>
              {editingPublicCourseId && <button type="button" onClick={() => { setEditingPublicCourseId(null); setPublicCourseDraft(emptyPublicCourse); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button>}
            </div>
          </form>
        </div>
      )}

      {activeTab === 'about' && (
        <form onSubmit={saveContent} className="space-y-6">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Homepage hero</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Homepage hero badge" value={content.home_hero_badge} onChange={(value) => updateContent('home_hero_badge', value)} />
              <ImageField label="Homepage hero image" value={content.home_hero_image} onChange={(value) => updateContent('home_hero_image', value)} />
              <Field label="Homepage hero title" value={content.home_hero_title} onChange={(value) => updateContent('home_hero_title', value)} required />
              <Field label="Homepage hero description" value={content.home_hero_description} onChange={(value) => updateContent('home_hero_description', value)} multiline required />
            </div>
          </section>

          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-black text-slate-900">Homepage · Life at Rhema</h2>
              <p className="mt-1 text-sm text-slate-500">Manage the section heading and three feature cards shown on the homepage.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Section badge" value={content.life_badge} onChange={(value) => updateContent('life_badge', value)} />
              <Field label="Section title" value={content.life_title} onChange={(value) => updateContent('life_title', value)} multiline />
              <Field label="Section description" value={content.life_description} onChange={(value) => updateContent('life_description', value)} multiline />
            </div>
            {[1, 2, 3].map((number) => {
              const field = (name: string) => `life_card_${number}_${name}` as keyof AboutContent;
              return (
                <div key={number} className="space-y-4 rounded-xl border border-slate-200 p-4">
                  <h3 className="font-black text-slate-800">Feature card {number}</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Card title" value={content[field('title')]} onChange={(value) => updateContent(field('title'), value)} />
                    <ImageField label="Card image" value={content[field('image')]} onChange={(value) => updateContent(field('image'), value)} />
                    <Field label="Card description" value={content[field('description')]} onChange={(value) => updateContent(field('description'), value)} multiline />
                    <Field label="Link label" value={content[field('link_label')]} onChange={(value) => updateContent(field('link_label'), value)} />
                    <Field label="Internal link path" value={content[field('link_url')]} onChange={(value) => updateContent(field('link_url'), value)} />
                  </div>
                </div>
              );
            })}
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">About page hero and story</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Hero badge" value={content.hero_badge} onChange={(value) => updateContent('hero_badge', value)} />
              <ImageField label="About page hero image" value={content.hero_image} onChange={(value) => updateContent('hero_image', value)} />
              <Field label="Hero title" value={content.hero_title} onChange={(value) => updateContent('hero_title', value)} required />
              <Field label="Hero description" value={content.hero_description} onChange={(value) => updateContent('hero_description', value)} multiline required />
              <Field label="Story heading" value={content.story_title} onChange={(value) => updateContent('story_title', value)} required />
              <Field label="Story text" value={content.story_text} onChange={(value) => updateContent('story_text', value)} multiline required />
            </div>
          </section>

          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Mission, vision, faith, and heritage</h2>
            <TextPair title="Mission heading" text="Mission text" titleValue={content.mission_title} textValue={content.mission_text} onTitleChange={(value) => updateContent('mission_title', value)} onTextChange={(value) => updateContent('mission_text', value)} />
            <TextPair title="Vision heading" text="Vision text" titleValue={content.vision_title} textValue={content.vision_text} onTitleChange={(value) => updateContent('vision_title', value)} onTextChange={(value) => updateContent('vision_text', value)} />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Faith statement heading" value={content.faith_title} onChange={(value) => updateContent('faith_title', value)} />
              <Field label="Faith statements (one statement per line)" value={content.faith_text} onChange={(value) => updateContent('faith_text', value)} multiline />
            </div>
            <TextPair title="Heritage heading" text="Heritage text" titleValue={content.heritage_title} textValue={content.heritage_text} onTitleChange={(value) => updateContent('heritage_title', value)} onTextChange={(value) => updateContent('heritage_text', value)} />
          </section>

          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Motto, community, and values</h2>
            <TextPair title="Motto heading" text="Motto text" titleValue={content.motto_title} textValue={content.motto_text} onTitleChange={(value) => updateContent('motto_title', value)} onTextChange={(value) => updateContent('motto_text', value)} />
            <TextPair title="Community heading" text="Community text" titleValue={content.community_title} textValue={content.community_text} onTitleChange={(value) => updateContent('community_title', value)} onTextChange={(value) => updateContent('community_text', value)} />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Values section heading" value={content.values_title} onChange={(value) => updateContent('values_title', value)} />
              <Field label="Values section description" value={content.values_description} onChange={(value) => updateContent('values_description', value)} multiline />
            </div>
            {[1, 2, 3, 4].map((number) => {
              const titleField = `value_${number}_title` as keyof AboutContent;
              const textField = `value_${number}_text` as keyof AboutContent;
              return (
                <TextPair
                  key={number}
                  title={`Value ${number} heading`}
                  text={`Value ${number} text`}
                  titleValue={content[titleField]}
                  textValue={content[textField]}
                  onTitleChange={(value) => updateContent(titleField, value)}
                  onTextChange={(value) => updateContent(textField, value)}
                />
              );
            })}
          </section>

          <button disabled={isSaving} type="submit" className="rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-600 disabled:cursor-wait disabled:opacity-60">
            {isSaving ? 'Saving...' : 'Save homepage and about'}
          </button>
        </form>
      )}

      {currentManagedPage && managedPages && (
        <form onSubmit={(event) => saveManagedPage(currentManagedPage, event)} className="space-y-6">
          <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
            Changes are stored in the website content database and shown on the public {currentManagedPage} page. New seed imports do not overwrite your edits.
          </p>
          {Object.entries(
            MANAGED_PAGE_FIELDS[currentManagedPage].reduce<Record<string, ManagedPageField[]>>((sections, field) => {
              (sections[field.section] ??= []).push(field);
              return sections;
            }, {}),
          ).map(([section, fields]) => (
            <section key={section} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-900">{section}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {fields.map((field) => (
                  <Field
                    key={field.key}
                    label={field.label}
                    value={managedPages[currentManagedPage][field.key] ?? ''}
                    onChange={(value) => setManagedPages((current) => current ? ({
                      ...current,
                      [currentManagedPage]: { ...current[currentManagedPage], [field.key]: value },
                    }) : current)}
                    multiline={field.multiline}
                    required={field.key === 'hero_title' || field.key === 'hero_description'}
                  />
                ))}
              </div>
            </section>
          ))}
          <button disabled={isSaving} type="submit" className="rounded-xl bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-600 disabled:cursor-wait disabled:opacity-60">
            {isSaving ? 'Saving...' : `Save ${currentManagedPage} page`}
          </button>
        </form>
      )}

      {activeTab === 'faculty' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900">Faculty profiles</h2>
            <p className="text-sm leading-6 text-slate-600">Faculty are managed separately from staff team members. Only profiles marked as published appear on the Faculty page.</p>
            {faculty.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">No faculty profiles have been added yet.</p>}
            {faculty.map((person) => (
              <article key={person.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">{person.name}</h3>
                  <p className="text-xs font-semibold text-blue-800">{person.role} · {person.is_published ? 'Published' : 'Draft'}</p>
                  <p className="mt-2 text-sm text-slate-600">{person.bio}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => startFacultyEdit(person)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Edit</button>
                  <button type="button" onClick={() => deletePerson('faculty', person.id)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Delete</button>
                </div>
              </article>
            ))}
          </section>
          <form onSubmit={(event) => savePerson('faculty', event)} className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">{editingFacultyId ? 'Edit faculty profile' : 'Add faculty profile'}</h2>
            <Field label="Name" value={facultyDraft.name} onChange={(value) => setFacultyDraft((current) => ({ ...current, name: value }))} required />
            <Field label="Teaching position or title" value={facultyDraft.role} onChange={(value) => setFacultyDraft((current) => ({ ...current, role: value }))} required />
            <Field label="Biography" value={facultyDraft.bio} onChange={(value) => setFacultyDraft((current) => ({ ...current, bio: value }))} multiline required />
            <ImageField label="Faculty profile photo" value={facultyDraft.avatar_url} onChange={(value) => setFacultyDraft((current) => ({ ...current, avatar_url: value }))} />
            <Field label="Display order" type="number" value={String(facultyDraft.sort_order)} onChange={(value) => setFacultyDraft((current) => ({ ...current, sort_order: Number(value) }))} />
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={facultyDraft.is_published === 1} onChange={(event) => setFacultyDraft((current) => ({ ...current, is_published: event.target.checked ? 1 : 0 }))} />
              Published on the faculty page
            </label>
            <div className="flex gap-2">
              <button disabled={isSaving} type="submit" className="rounded-xl bg-blue-800 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">{isSaving ? 'Saving...' : editingFacultyId ? 'Save changes' : 'Add faculty profile'}</button>
              {editingFacultyId && <button type="button" onClick={() => { setEditingFacultyId(null); setFacultyDraft(emptyFaculty); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button>}
            </div>
          </form>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900">Staff team members</h2>
            {team.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">No team members have been added yet.</p>}
            {team.map((person) => (
              <article key={person.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">{person.name}</h3>
                  <p className="text-xs font-semibold text-red-700">{person.role} · {person.is_published ? 'Published' : 'Draft'}</p>
                  <p className="mt-2 text-sm text-slate-600">{person.bio}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => startTeamEdit(person)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Edit</button>
                  <button type="button" onClick={() => deletePerson('team', person.id)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Delete</button>
                </div>
              </article>
            ))}
          </section>
          <form onSubmit={(event) => savePerson('team', event)} className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">{editingTeamId ? 'Edit team member' : 'Add or publish a team member'}</h2>
            <label className="block text-xs font-bold text-slate-600">
              Profile source
              <select value={currentSourceKey} onChange={(event) => selectTeamSource(event.target.value)} className={inputClass}>
                <option value="manual">Create a new team profile</option>
                {currentSourceUnavailable && <option value={currentSourceKey} disabled>Linked profile unavailable or inactive</option>}
                {selectablePeople.map((person) => (
                  <option key={`${person.source_type}:${person.id}`} value={`${person.source_type === 'lecturer' ? 'staff' : person.source_type}:${person.id}`}>
                    {person.name} · {person.role} ({person.source_type === 'admin' ? 'administrator' : person.source_type})
                  </option>
                ))}
              </select>
            </label>
            {currentSourceUnavailable && <p className="text-xs leading-5 text-amber-700">This linked profile is no longer active. Select a manual profile to edit its public details, or delete it.</p>}
            <Field label="Name" value={teamDraft.name} onChange={(value) => setTeamDraft((current) => ({ ...current, name: value }))} required disabled={teamDraft.source_type !== 'manual'} />
            <Field label="Position" value={teamDraft.role} onChange={(value) => setTeamDraft((current) => ({ ...current, role: value }))} required disabled={teamDraft.source_type !== 'manual'} />
            <Field label="Biography (optional for linked profiles)" value={teamDraft.bio} onChange={(value) => setTeamDraft((current) => ({ ...current, bio: value }))} multiline required={teamDraft.source_type === 'manual'} />
            <ImageField label="Staff profile photo" value={teamDraft.avatar_url} onChange={(value) => setTeamDraft((current) => ({ ...current, avatar_url: value }))} disabled={teamDraft.source_type !== 'manual'} />
            <Field label="Display order" type="number" value={String(teamDraft.sort_order)} onChange={(value) => setTeamDraft((current) => ({ ...current, sort_order: Number(value) }))} />
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={teamDraft.is_published === 1} onChange={(event) => setTeamDraft((current) => ({ ...current, is_published: event.target.checked ? 1 : 0 }))} />
              Published on the public site
            </label>
            <div className="flex gap-2">
              <button disabled={isSaving} type="submit" className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">{isSaving ? 'Saving...' : editingTeamId ? 'Save changes' : 'Add team member'}</button>
              {editingTeamId && <button type="button" onClick={() => { setEditingTeamId(null); setTeamDraft(emptyTeam); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button>}
            </div>
          </form>
        </div>
      )}

      {activeTab === 'testimonies' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
          <section className="space-y-3">
            <h2 className="text-lg font-black text-slate-900">Testimonies</h2>
            {testimonies.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">No testimonies have been added yet.</p>}
            {testimonies.map((testimony) => (
              <article key={testimony.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">{testimony.author_name}</h3>
                  <p className="text-xs font-semibold text-red-700">{testimony.author_role || 'Community member'} · {testimony.is_published ? 'Published' : 'Draft'}</p>
                  <p className="mt-2 text-sm text-slate-600">{testimony.quote_text}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => startTestimonyEdit(testimony)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Edit</button>
                  <button type="button" onClick={() => deletePerson('testimonial', testimony.id)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Delete</button>
                </div>
              </article>
            ))}
          </section>
          <form onSubmit={(event) => savePerson('testimonial', event)} className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">{editingTestimonyId ? 'Edit testimony' : 'Add testimony'}</h2>
            <Field label="Name" value={testimonyDraft.author_name} onChange={(value) => setTestimonyDraft((current) => ({ ...current, author_name: value }))} required />
            <Field label="Relationship or role" value={testimonyDraft.author_role} onChange={(value) => setTestimonyDraft((current) => ({ ...current, author_role: value }))} />
            <Field label="Testimony" value={testimonyDraft.quote_text} onChange={(value) => setTestimonyDraft((current) => ({ ...current, quote_text: value }))} multiline required />
            <ImageField label="Testimony photo" value={testimonyDraft.avatar_url} onChange={(value) => setTestimonyDraft((current) => ({ ...current, avatar_url: value }))} />
            <Field label="Display order" type="number" value={String(testimonyDraft.sort_order)} onChange={(value) => setTestimonyDraft((current) => ({ ...current, sort_order: Number(value) }))} />
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={testimonyDraft.is_published === 1} onChange={(event) => setTestimonyDraft((current) => ({ ...current, is_published: event.target.checked ? 1 : 0 }))} />
              Published on the public site
            </label>
            <div className="flex gap-2">
              <button disabled={isSaving} type="submit" className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">{isSaving ? 'Saving...' : editingTestimonyId ? 'Save changes' : 'Add testimony'}</button>
              {editingTestimonyId && <button type="button" onClick={() => { setEditingTestimonyId(null); setTestimonyDraft(emptyTestimony); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button>}
            </div>
          </form>
        </div>
      )}

      {activeTab === 'submissions' && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Individual submissions</h2>
              <p className="mt-1 text-sm text-slate-500">These are private until an admin reviews and adds them as unpublished drafts.</p>
            </div>
            <form onSubmit={sendTestimonyInvite} className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <label className="sr-only" htmlFor="testimony-invite-email">Recipient email</label>
              <input id="testimony-invite-email" type="email" required maxLength={254} value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="Recipient email address" className="min-w-64 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-400" />
              <button disabled={isSendingInvite} type="submit" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{isSendingInvite ? 'Sending...' : 'Send private invite'}</button>
            </form>
          </div>
          <p className="text-xs leading-5 text-slate-500">Each invite emails a private one-time link that expires after 7 days. The form cannot be accessed without a valid invite token.</p>
          {submissions.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">No testimony submissions are waiting for review.</p>}
          <div className="grid gap-4">
            {submissions.map((submission) => (
              <article key={submission.id} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
                {submission.avatar_url ? (
                  <div className="h-16 w-16 rounded-full bg-cover bg-center ring-2 ring-orange-400" role="img" aria-label={`${submission.author_name} avatar`} style={{ backgroundImage: `url("${assetUrl(submission.avatar_url)}")` }} />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-950 text-lg font-black text-amber-300 ring-2 ring-orange-400">{submission.author_name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-bold text-slate-900">{submission.author_name}</h3>
                    <time className="text-xs text-slate-500">{new Date(submission.submitted_at).toLocaleDateString()}</time>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{submission.quote_text}</p>
                  <p className="mt-2 text-xs text-slate-500">{submission.quote_text.trim().split(/\s+/).length}/250 words</p>
                </div>
                <div className="flex flex-wrap gap-2 md:flex-col">
                  <button type="button" disabled={isSaving} onClick={() => reviewSubmission(submission, 'add')} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">Review &amp; add as draft</button>
                  <button type="button" disabled={isSaving} onClick={() => reviewSubmission(submission, 'dismiss')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 disabled:opacity-60">Dismiss</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
