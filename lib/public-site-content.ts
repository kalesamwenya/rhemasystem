import { api } from '@/lib/api';

export type PublicCourse = {
  id: number;
  course: string;
  description: string;
  cohort: number;
  cohortName: string;
  sort_order?: number;
  is_published?: number;
};

export type AboutContent = {
  hero_badge: string;
  hero_title: string;
  hero_description: string;
  hero_image: string;
  home_hero_badge: string;
  home_hero_title: string;
  home_hero_description: string;
  home_hero_image: string;
  life_badge: string;
  life_title: string;
  life_description: string;
  life_card_1_title: string;
  life_card_1_description: string;
  life_card_1_image: string;
  life_card_1_link_label: string;
  life_card_1_link_url: string;
  life_card_2_title: string;
  life_card_2_description: string;
  life_card_2_image: string;
  life_card_2_link_label: string;
  life_card_2_link_url: string;
  life_card_3_title: string;
  life_card_3_description: string;
  life_card_3_image: string;
  life_card_3_link_label: string;
  life_card_3_link_url: string;
  story_title: string;
  story_text: string;
  mission_title: string;
  mission_text: string;
  vision_title: string;
  vision_text: string;
  faith_title: string;
  faith_text: string;
  heritage_title: string;
  heritage_text: string;
  motto_title: string;
  motto_text: string;
  community_title: string;
  community_text: string;
  values_title: string;
  values_description: string;
  value_1_title: string;
  value_1_text: string;
  value_2_title: string;
  value_2_text: string;
  value_3_title: string;
  value_3_text: string;
  value_4_title: string;
  value_4_text: string;
};

export type AboutPerson = {
  id: number;
  name: string;
  role: string;
  bio: string;
  avatar_url: string;
  source_type: 'manual' | 'staff' | 'admin';
  source_id: number | null;
  sort_order: number;
  is_published: number;
};

export type FacultyMember = {
  id: number;
  name: string;
  role: string;
  bio: string;
  avatar_url: string;
  sort_order: number;
  is_published: number;
};

export type AvailableTeamProfile = {
  id: number;
  name: string;
  role: string;
  avatar_url: string;
  source_type: 'staff' | 'lecturer' | 'admin';
};

export type AboutTestimonial = {
  id: number;
  author_name: string;
  author_role: string;
  quote_text: string;
  avatar_url: string;
  sort_order: number;
  is_published: number;
};

export type TestimonySubmission = {
  id: number;
  author_name: string;
  quote_text: string;
  avatar_url: string;
  submitted_at: string;
};

export type AboutPageContent = {
  content: AboutContent | null;
  team: AboutPerson[];
  faculty: FacultyMember[];
  testimonials: AboutTestimonial[];
  available_people?: AvailableTeamProfile[];
  submissions?: TestimonySubmission[];
};

export type ManagedPageKey =
  | 'admissions'
  | 'contact'
  | 'community'
  | 'academics'
  | 'fees'
  | 'privacy'
  | 'terms';

export type ManagedPageContent = Record<string, string>;

export type ManagedPageField = {
  key: string;
  label: string;
  section: string;
  multiline?: boolean;
};

export const MANAGED_PAGE_FIELDS: Record<ManagedPageKey, ManagedPageField[]> = {
  admissions: [
    { key: 'hero_badge', label: 'Hero badge', section: 'Admissions hero' },
    { key: 'hero_title', label: 'Hero title', section: 'Admissions hero', multiline: true },
    { key: 'hero_description', label: 'Hero description', section: 'Admissions hero', multiline: true },
    { key: 'steps_badge', label: 'Steps badge', section: 'Application steps' },
    { key: 'steps_title', label: 'Steps heading', section: 'Application steps' },
    { key: 'steps_description', label: 'Steps introduction', section: 'Application steps', multiline: true },
    ...[1, 2, 3, 4].flatMap((number) => [
      { key: `step_${number}_title`, label: `Step ${number} title`, section: 'Application steps' },
      { key: `step_${number}_description`, label: `Step ${number} description`, section: 'Application steps', multiline: true },
    ]),
    { key: 'links_title', label: 'Admissions links heading', section: 'Application steps' },
    { key: 'application_link_label', label: 'Application link label', section: 'Application steps' },
    { key: 'requirements_badge', label: 'Checklist badge', section: 'Requirements' },
    { key: 'requirements_title', label: 'Checklist heading', section: 'Requirements' },
    ...[1, 2, 3].flatMap((number) => [
      { key: `requirement_${number}_title`, label: `Requirement ${number} title`, section: 'Requirements' },
      { key: `requirement_${number}_description`, label: `Requirement ${number} description`, section: 'Requirements', multiline: true },
    ]),
    { key: 'referee_note', label: 'Referee note', section: 'Requirements', multiline: true },
    { key: 'help_badge', label: 'Help badge', section: 'Admissions help' },
    { key: 'help_title', label: 'Help heading', section: 'Admissions help' },
    { key: 'help_description', label: 'Help description', section: 'Admissions help', multiline: true },
    { key: 'help_link_label', label: 'Help link label', section: 'Admissions help' },
  ],
  contact: [
    { key: 'hero_badge', label: 'Hero badge', section: 'Contact hero' },
    { key: 'hero_title', label: 'Hero title', section: 'Contact hero', multiline: true },
    { key: 'hero_description', label: 'Hero description', section: 'Contact hero', multiline: true },
    { key: 'phone_label', label: 'Phone label', section: 'Contact details' },
    { key: 'phone_number', label: 'Phone number', section: 'Contact details' },
    { key: 'address_label', label: 'Address label', section: 'Contact details' },
    { key: 'school_address', label: 'School address', section: 'Contact details', multiline: true },
    { key: 'office_hours_label', label: 'Office hours label', section: 'Contact details' },
    { key: 'office_hours', label: 'Office hours', section: 'Contact details', multiline: true },
    { key: 'portal_label', label: 'Portal label', section: 'Contact details' },
    { key: 'portal_link_label', label: 'Portal link label', section: 'Contact details' },
    { key: 'form_badge', label: 'Enquiry form badge', section: 'Contact form' },
    { key: 'form_title', label: 'Enquiry form title', section: 'Contact form' },
    { key: 'campus_badge', label: 'Campus badge', section: 'Campus section' },
    { key: 'campus_title', label: 'Campus heading', section: 'Campus section' },
    { key: 'footer_description', label: 'Footer description', section: 'Site footer', multiline: true },
    { key: 'footer_address_line_1', label: 'Footer address line 1', section: 'Site footer' },
    { key: 'footer_address_line_2', label: 'Footer address line 2', section: 'Site footer' },
    { key: 'footer_school_name', label: 'Footer school name', section: 'Site footer' },
  ],
  community: [
    { key: 'hero_badge', label: 'Hero badge', section: 'Community hero' },
    { key: 'hero_title', label: 'Hero title', section: 'Community hero', multiline: true },
    { key: 'hero_description', label: 'Hero description', section: 'Community hero', multiline: true },
    { key: 'alumni_badge', label: 'Alumni badge', section: 'Alumni' },
    { key: 'alumni_title', label: 'Alumni heading', section: 'Alumni', multiline: true },
    { key: 'alumni_description', label: 'Alumni description', section: 'Alumni', multiline: true },
    { key: 'alumni_callout', label: 'Alumni callout', section: 'Alumni', multiline: true },
    { key: 'rmai_badge', label: 'RMAI badge', section: 'RMAI' },
    { key: 'rmai_title', label: 'RMAI heading', section: 'RMAI', multiline: true },
    { key: 'rmai_description', label: 'RMAI description', section: 'RMAI', multiline: true },
    { key: 'partnerships_badge', label: 'Partnerships badge', section: 'Partnerships' },
    { key: 'partnerships_title', label: 'Partnerships heading', section: 'Partnerships', multiline: true },
    { key: 'partnerships_description', label: 'Partnerships description', section: 'Partnerships', multiline: true },
    { key: 'links_title', label: 'Community links heading', section: 'Community links' },
    { key: 'events_badge', label: 'Events callout badge', section: 'Community links' },
    { key: 'events_title', label: 'Events callout heading', section: 'Community links' },
  ],
  academics: [
    { key: 'hero_badge', label: 'Hero badge', section: 'Academics hero' },
    { key: 'hero_title', label: 'Hero title', section: 'Academics hero', multiline: true },
    { key: 'hero_description', label: 'Hero description', section: 'Academics hero', multiline: true },
    { key: 'program_badge', label: 'Program badge', section: 'Program overview' },
    { key: 'program_title', label: 'Program heading', section: 'Program overview', multiline: true },
    { key: 'program_description', label: 'Program description', section: 'Program overview', multiline: true },
    { key: 'calendar_note', label: 'Academic calendar note', section: 'Program overview', multiline: true },
    { key: 'feature_title', label: 'Feature heading', section: 'Program overview' },
    { key: 'feature_description', label: 'Feature description', section: 'Program overview', multiline: true },
    { key: 'course_intro', label: 'Course information intro', section: 'Courses' },
    { key: 'prayer_badge', label: 'Prayer school badge', section: 'Prayer school' },
    { key: 'prayer_title', label: 'Prayer school heading', section: 'Prayer school', multiline: true },
    { key: 'prayer_description', label: 'Prayer school description', section: 'Prayer school', multiline: true },
    { key: 'prayer_card_title', label: 'Prayer school card heading', section: 'Prayer school' },
    { key: 'prayer_card_description', label: 'Prayer school card description', section: 'Prayer school', multiline: true },
    { key: 'prayer_link_label', label: 'Prayer school link label', section: 'Prayer school' },
    { key: 'cta_title', label: 'Admissions callout heading', section: 'Admissions callout', multiline: true },
    { key: 'cta_description', label: 'Admissions callout description', section: 'Admissions callout', multiline: true },
    { key: 'cta_link_label', label: 'Admissions callout link label', section: 'Admissions callout' },
  ],
  fees: [
    { key: 'hero_badge', label: 'Hero badge', section: 'Fee information' },
    { key: 'hero_title', label: 'Hero title', section: 'Fee information', multiline: true },
    { key: 'hero_description', label: 'Hero description', section: 'Fee information', multiline: true },
    { key: 'contact_title', label: 'Contact card heading', section: 'Fee information' },
    { key: 'contact_description', label: 'Contact card description', section: 'Fee information', multiline: true },
    { key: 'contact_link_label', label: 'Contact link label', section: 'Fee information' },
  ],
  privacy: [
    { key: 'hero_badge', label: 'Hero badge', section: 'Privacy policy' },
    { key: 'hero_title', label: 'Hero title', section: 'Privacy policy', multiline: true },
    { key: 'hero_description', label: 'Hero description', section: 'Privacy policy', multiline: true },
    { key: 'section_badge', label: 'Section badge', section: 'Privacy policy' },
    { key: 'section_title', label: 'Section heading', section: 'Privacy policy' },
    { key: 'section_description', label: 'Section introduction', section: 'Privacy policy', multiline: true },
    ...[1, 2, 3, 4, 5, 6].map((number) => ({
      key: `point_${number}`,
      label: `Policy point ${number}`,
      section: 'Privacy policy',
      multiline: true,
    })),
  ],
  terms: [
    { key: 'hero_badge', label: 'Hero badge', section: 'Terms of use' },
    { key: 'hero_title', label: 'Hero title', section: 'Terms of use', multiline: true },
    { key: 'hero_description', label: 'Hero description', section: 'Terms of use', multiline: true },
    { key: 'section_badge', label: 'Section badge', section: 'Terms of use' },
    { key: 'section_title', label: 'Section heading', section: 'Terms of use' },
    { key: 'section_description', label: 'Section introduction', section: 'Terms of use', multiline: true },
    ...[1, 2, 3, 4].flatMap((number) => [
      { key: `section_${number}_title`, label: `Terms section ${number} title`, section: 'Terms of use' },
      { key: `section_${number}_text`, label: `Terms section ${number} text`, section: 'Terms of use', multiline: true },
    ]),
  ],
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export async function loadPublicCourses(): Promise<PublicCourse[]> {
  const response = await api.courses.publicList() as ApiResponse<PublicCourse[]>;
  if (!response.success || !Array.isArray(response.data)) {
    throw new Error(response.message ?? 'Unable to load courses.');
  }
  return response.data;
}

export async function loadAboutContent(admin = false): Promise<AboutPageContent> {
  const response = await (admin ? api.siteContent.adminAbout() : api.siteContent.publicAbout()) as ApiResponse<AboutPageContent>;
  if (!response.success || !response.data) {
    throw new Error(response.message ?? 'Unable to load about page content.');
  }
  return response.data;
}

export async function loadManagedPageContent(
  page: ManagedPageKey,
  admin = false,
): Promise<ManagedPageContent> {
  const query = new URLSearchParams({ page });
  if (admin) query.set('admin', '1');
  const response = await api.siteContent.pageContent(query.toString()) as ApiResponse<ManagedPageContent>;
  if (!response.success || !response.data) {
    throw new Error(response.message ?? `Unable to load ${page} page content.`);
  }
  return response.data;
}

export async function loadAllManagedPageContent(): Promise<Record<ManagedPageKey, ManagedPageContent>> {
  const response = await api.siteContent.adminPageContent() as ApiResponse<Record<ManagedPageKey, ManagedPageContent>>;
  if (!response.success || !response.data) {
    throw new Error(response.message ?? 'Unable to load managed website pages.');
  }
  return response.data;
}
