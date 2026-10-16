import { api } from '@/lib/api';

export type RhemaSession = {
  id: string;
  date: string;
  start: string;
  end: string;
  notes: string;
};

export type RhemaSchedule = {
  id: string;
  course: string;
  description?: string;
  cohort: number;
  cohortName: string;
  sessions: RhemaSession[];
};

export type RhemaSchedulesPayload = {
  schedules: RhemaSchedule[];
  enrollments: Record<string, string[]>;
};

export type RhemaStudent = {
  id: string;
  name: string;
  cohort: string;
  email?: string;
  accountStatus?: string;
};

export type RhemaAttendanceRecord = {
  id: number;
  student_id: string;
  name: string;
  course: string;
  schedule_id: string;
  session_cohort: string;
  profile_cohort: string;
  date: string;
  time: string;
  created_at?: string;
};

export type RhemaApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export const RHEMA_API_BASE_URL = api.baseUrl;

export const RHEMA_SCHEDULE_ENDPOINTS = {
  list: '/schedules/getSchedules.php',
  sync: '/schedules/syncSchedules.php',
  students: '/students/getStudents.php',
  attendance: '/logs/getLogs.php',
  addSession: '/schedules/Addsession.php',
  updateSession: '/schedules/Updatesession.php',
  deleteSession: '/schedules/Deletesession.php',
  deleteCourse: '/schedules/deleteSchedule.php',
} as const;

export async function requestRhemaSchedules(endpoint: string = RHEMA_SCHEDULE_ENDPOINTS.list): Promise<RhemaSchedulesPayload> {
  const body = await api.courses.schedules() as RhemaApiResponse<RhemaSchedulesPayload>;
  if (!body.success || !body.data) throw new Error(body.message ?? 'Unable to load schedules.');
  return body.data;
}

export async function syncRhemaSchedules(payload: RhemaSchedulesPayload, endpoint: string = RHEMA_SCHEDULE_ENDPOINTS.sync): Promise<void> {
  const body = await api.courses.syncSchedules(payload) as RhemaApiResponse<unknown>;
  if (!body.success) throw new Error(body.message ?? 'Unable to sync schedules.');
}

export async function requestRhemaStudents(endpoint: string = RHEMA_SCHEDULE_ENDPOINTS.students): Promise<RhemaStudent[]> {
  const body = await api.students.adminRoster() as RhemaApiResponse<Array<{
    student_id: string;
    name: string;
    class: string;
    email?: string;
    account_status?: string;
  }>>;
  if (!body.success || !body.data) throw new Error(body.message ?? 'Unable to load students.');
  return body.data.map((student) => ({
    id: String(student.student_id),
    name: student.name,
    cohort: student.class,
    email: student.email,
    accountStatus: student.account_status,
  }));
}

export async function requestRhemaAttendance(endpoint: string = RHEMA_SCHEDULE_ENDPOINTS.attendance): Promise<RhemaAttendanceRecord[]> {
  const body = await api.attendance.list() as RhemaApiResponse<RhemaAttendanceRecord[]>;
  if (!body.success || !body.data) throw new Error(body.message ?? 'Unable to load attendance records.');
  return body.data;
}
