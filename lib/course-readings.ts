import { api } from '@/lib/api';

export type CourseReading = {
  id: number;
  resource_type: 'Document' | 'Link' | 'Audio';
  title: string;
  course: string;
  session_name: string;
  description?: string;
  owner?: string;
  file_url?: string;
  external_url?: string;
  status: 'Draft' | 'Published' | 'Live';
};

export type CourseReadingProgress = {
  resource_id: number;
  completed: boolean;
};

export function courseReadingUrl(reading: CourseReading): string {
  if (reading.external_url && /^https?:\/\//i.test(reading.external_url)) return reading.external_url;
  if (!reading.file_url) return '';
  if (/^https?:\/\//i.test(reading.file_url)) return reading.file_url;
  return `${api.baseUrl}/${reading.file_url.replace(/^\/+/, '')}`;
}

export function isCourseReading(reading: CourseReading, course: string): boolean {
  return reading.course.trim().toLowerCase() === course.trim().toLowerCase()
    && reading.resource_type !== 'Audio';
}
