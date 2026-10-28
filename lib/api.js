import { getAuthToken } from '@/lib/auth';
import { getActivityVisitorId } from '@/lib/activity-identity';

const PRODUCTION_API_URL = 'http://localruntest.com';
const DEVELOPMENT_API_URL = PRODUCTION_API_URL;

function resolveApiBaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL
    || (process.env.NODE_ENV === 'production' ? PRODUCTION_API_URL : DEVELOPMENT_API_URL);
  const configuredUrl = rawUrl.trim().replace(/\/$/, '');

  try {
    const parsedUrl = new URL(configuredUrl);
    if (parsedUrl.hostname === 'localruntest.com') {
      return PRODUCTION_API_URL;
    }
    const isLocalServer = ['localhost', '127.0.0.1'].includes(parsedUrl.hostname);
    if (!isLocalServer && typeof window !== 'undefined' && window.location.protocol === 'https:' && parsedUrl.protocol === 'http:') {
      parsedUrl.protocol = 'https:';
    }
    return parsedUrl.toString().replace(/\/$/, '');
  } catch {
    return configuredUrl;
  }
}

const API_BASE_URL = resolveApiBaseUrl();
const USER_KEY = 'rhema_user';
const ACCESS_TOKEN_KEY = 'rhema_access_token';
const TOKEN_EXPIRY_KEY = 'rhema_access_token_expires_at';

function resolveApiRequestUrl(path, sameOrigin = false) {
  const baseUrl = sameOrigin && typeof window !== 'undefined'
    ? `${window.location.origin}/`
    : `${API_BASE_URL}/`;
  return new URL(String(path).replace(/^\/+/, ''), baseUrl);
}

function createRequestId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

function getLoginPathForCurrentRoute() {
  if (typeof window === 'undefined') return '/login';
  const { pathname, search } = window.location;
  const accountType = pathname.startsWith('/admin')
    ? 'admin'
    : pathname.startsWith('/lecturer')
      ? 'lecturer'
      : 'student';
  const routePrefix = `/${accountType}`;
  const nextPath = pathname === routePrefix || pathname.startsWith(`${routePrefix}/`)
    ? `${pathname}${search}`
    : '';
  const query = new URLSearchParams({ type: accountType });
  if (nextPath) query.set('next', nextPath);
  return `/login?${query.toString()}`;
}

let activityLogWarningShown = false;

function sendActivityRecord(url, method, status, succeeded, durationMs, responseSummary) {
  if (typeof window === 'undefined') return;
  let requestUrl;
  try {
    requestUrl = new URL(url, window.location.origin);
  } catch {
    return;
  }
  if (requestUrl.pathname === '/api/activity-logs' || requestUrl.pathname === '/logs/activity.php') return;

  const visitorId = getActivityVisitorId();
  if (!visitorId) return;
  const token = getAuthToken();
  const requestId = window.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (token) headers.set('Authorization', 'Bearer ' + token);

  void fetch('/api/activity-logs', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      request_id: requestId,
      visitor_id: visitorId,
      method: method.toUpperCase(),
      path: requestUrl.pathname,
      status,
      succeeded,
      duration_ms: Math.min(600000, Math.max(0, Math.round(durationMs))),
      response_summary: responseSummary.slice(0, 500),
    }),
    cache: 'no-store',
    credentials: 'include',
    keepalive: true,
  }).then((response) => {
    if (!response.ok && !activityLogWarningShown) {
      activityLogWarningShown = true;
      console.warn(`Activity logging is unavailable (HTTP ${response.status}).`);
    }
  }).catch((error) => {
    if (activityLogWarningShown) return;
    activityLogWarningShown = true;
    console.warn('Activity logging could not reach the server.', error);
  });
}

function recordApiActivity(url, method, status, succeeded, durationMs, responseBody, fallbackSummary = '') {
  const responseSummary = fallbackSummary
    || (succeeded ? 'Request completed.' : `Request failed (${status ? `HTTP ${status}` : 'network error'}).`);
  sendActivityRecord(url, method, status, succeeded, durationMs, responseSummary);
}

export function recordClientActivity(summary, method = 'POST', path) {
  if (typeof window === 'undefined') return;
  const safeMethod = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())
    ? method.toUpperCase()
    : 'POST';
  sendActivityRecord(
    path || window.location.pathname,
    safeMethod,
    200,
    true,
    0,
    summary,
  );
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(USER_KEY);
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
}

export function assetUrl(path) {
  if (!path || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) return path || '';
  return `${API_BASE_URL}/${String(path).replace(/^\//, '')}`;
}

/**
 * @template T
 * @returns {Promise<T>}
 */
export async function request(path, options = {}, { redirectOnUnauthorized = true, sameOrigin = false } = {}) {
  const requestUrl = resolveApiRequestUrl(path, sameOrigin);
  const url = requestUrl.toString();
  const isLoginRequest = /\/auth\/(?:login|adminLogin|lecturerLogin|portalLogin)\.php$/.test(requestUrl.pathname);
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  const requestId = headers.get('X-Request-Id') || createRequestId();
  headers.set('X-Request-Id', requestId);
  const accessToken = isLoginRequest ? null : getAuthToken();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (isFormData) {
    headers.delete('Content-Type');
  } else if (options.body) {
    headers.set('Content-Type', 'text/plain;charset=UTF-8');
  }
  let response;
  const startedAt = Date.now();
  try {
    response = await fetch(url, {
      ...options,
      cache: 'no-store',
      credentials: 'include',
      headers,
    });
  } catch (cause) {
    recordApiActivity(url, options.method || 'GET', 0, false, Date.now() - startedAt, null, 'Network request failed.');
    if (cause instanceof TypeError) {
      if (sameOrigin) {
        const error = new Error('The portal server could not be reached. Please retry; contact support if the problem continues.');
        error.name = 'NetworkRequestError';
        throw error;
      }
      const portalOrigin = typeof window !== 'undefined' ? window.location.origin : 'this portal';
      const healthUrl = new URL('health.php', `${requestUrl.origin}/`).toString();
      const error = new Error(`The browser could not read a response from the PHP API at ${requestUrl.origin} (request: ${requestId}). If Hostinger shows a browser-verification page, open ${healthUrl} in this browser, wait for the API status JSON, then reload ${portalOrigin}. Otherwise check the API host and its CORS settings.`);
      error.name = 'NetworkRequestError';
      throw error;
    }
    throw cause;
  }

  const text = await response.text();
  const unauthorized = response.status === 401 && redirectOnUnauthorized && !isLoginRequest && typeof window !== 'undefined';
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    recordApiActivity(url, options.method || 'GET', response.status, false, Date.now() - startedAt, null, 'The server returned an invalid response.');
    const endpointHint = requestUrl.pathname === '/api/communications'
      ? ' This browser is still requesting the retired communications proxy; restart the Next.js server and hard-refresh the page.'
      : '';
    throw new Error(`Invalid JSON response from ${url}.${endpointHint}`);
  }
  recordApiActivity(
    url,
    options.method || 'GET',
    response.status,
    response.ok && body.success !== false,
    Date.now() - startedAt,
    body,
  );

  if (unauthorized) {
    clearAuthSession();
    const loginPath = getLoginPathForCurrentRoute();
    if (window.location.pathname !== loginPath) window.location.assign(loginPath);
  }

  if (!response.ok || body.success === false) {
    const errorReference = body.error_reference && !String(body.message || '').includes(String(body.error_reference))
      ? ` (reference: ${body.error_reference})`
      : '';
    const requestId = body.request_id ? ` (request: ${body.request_id})` : '';
    const debugError = typeof body.debug_error === 'string' ? `: ${body.debug_error}` : '';
    const missingTables = Array.isArray(body.missing_tables) && body.missing_tables.length
      ? ` Missing tables: ${body.missing_tables.join(', ')}.`
      : '';
    const missingColumns = Array.isArray(body.missing_columns) && body.missing_columns.length
      ? ` Missing columns: ${body.missing_columns.join(', ')}.`
      : '';
    const error = new Error((body.message || `Request failed (${response.status})`) + missingTables + missingColumns + errorReference + requestId + debugError);
    error.status = response.status;
    throw error;
  }
  return body;
}

/** @returns {Promise<Blob>} */
export async function requestBlob(path, { redirectOnUnauthorized = true, sameOrigin = false } = {}) {
  const requestUrl = resolveApiRequestUrl(path, sameOrigin);
  const headers = new Headers({ Accept: 'application/pdf, application/json' });
  headers.set('X-Request-Id', createRequestId());
  const accessToken = getAuthToken();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const startedAt = Date.now();
  let response;
  try {
    response = await fetch(requestUrl.toString(), {
      cache: 'no-store',
      credentials: 'include',
      headers,
    });
  } catch (cause) {
    recordApiActivity(requestUrl.toString(), 'GET', 0, false, Date.now() - startedAt, null, 'Network request failed.');
    if (cause instanceof TypeError) cause.name = 'NetworkRequestError';
    throw cause;
  }
  if (!response.ok) {
    let body = {};
    try {
      body = await response.json();
    } catch {
      recordApiActivity(requestUrl.toString(), 'GET', response.status, false, Date.now() - startedAt, null, 'The server returned an invalid response.');
      throw new Error(`Request failed (${response.status})`);
    }
    recordApiActivity(requestUrl.toString(), 'GET', response.status, false, Date.now() - startedAt, body);
    if (response.status === 401 && redirectOnUnauthorized && typeof window !== 'undefined') {
      clearAuthSession();
      const loginPath = getLoginPathForCurrentRoute();
      if (window.location.pathname !== loginPath) window.location.assign(loginPath);
    }
    throw new Error(body.message || `Request failed (${response.status})`);
  }
  recordApiActivity(requestUrl.toString(), 'GET', response.status, true, Date.now() - startedAt, null, 'Binary response received.');
  return response.blob();
}

export async function uploadPdfDocument(blob, folder, filename, paymentReference = '', documentType = '', transactionId = '', paymentType = '') {
  const safeFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  const file = new File([blob], safeFilename, { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  if (paymentReference) formData.append('payment_reference', paymentReference);
  if (documentType) formData.append('document_type', documentType);
  if (transactionId) formData.append('transaction_id', transactionId);
  if (paymentType) formData.append('payment_type', paymentType);

  return request('/payments/uploadReceipt.php', { method: 'POST', body: formData });
}

/**
 * @template T
 * @returns {Promise<T>}
 */
export const json = (method, path, data, requestOptions) => request(path, { method, body: JSON.stringify(data) }, requestOptions);

export async function fetchPartnershipsContent() {
  const response = await request('/site-content/getPageContent.php?page=community', {}, { redirectOnUnauthorized: false });
  const content = response.data;
  if (!content || typeof content !== 'object') throw new Error('Partnership page content is unavailable.');
  return {
    hero_title: content.partnerships_title,
    hero_subtitle: content.partnerships_badge,
    hero_description: content.partnerships_description,
  };
}

export const api = {
  baseUrl: API_BASE_URL,
  health: () => request('/health.php'),
  login: (data) => json('POST', '/auth/login.php', data),
  portalLogin: (data) => json('POST', '/auth/portalLogin.php', data),
  adminLogin: (data) => json('POST', '/auth/adminLogin.php', data),
  lecturerLogin: (data) => json('POST', '/auth/lecturerLogin.php', data),
  adminSession: () => request('/auth/getAdminSession.php'),
  lecturerSession: () => request('/auth/getLecturerSession.php'),
  lecturerProfile: () => request('/auth/getLecturerProfile.php'),
  updateLecturerProfile: (data) => json('POST', '/auth/updateLecturerProfile.php', data),
  changeLecturerPassword: (data) => json('POST', '/auth/changeLecturerPassword.php', data),
  uploadLecturerAvatar: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/auth/uploadLecturerAvatar.php', { method: 'POST', body: formData });
  },
  forgotPassword: (data) => json('POST', '/auth/forgotPassword.php', data),
  resetPassword: (data) => json('POST', '/auth/resetPassword.php', data),
  logout: () => json('POST', '/auth/logout.php', {}),

  admissions: {
    list: () => request('/admissions/getApplications.php'),
    getEnrollmentStatus: () => request('/admissions/getEnrollmentStatus.php', {}, { redirectOnUnauthorized: false }),
    initiateFeePayment: (applicationId) => json('POST', '/admissions/initiateApplicationFeePayment.php', { application_id: applicationId }, { redirectOnUnauthorized: false }),
    verifyFeePayment: (transactionId, reference) => request(`/admissions/verifyApplicationFeePayment.php?${new URLSearchParams({ transaction_id: transactionId, tx_ref: reference })}`, {}, { redirectOnUnauthorized: false }),
    get: (token) => request(`/admissions/getApplication.php?token=${encodeURIComponent(token)}`, {}, { redirectOnUnauthorized: false }),
    getStatus: (token) => json('POST', '/admissions/getApplicationStatus.php', { token }, { redirectOnUnauthorized: false }),
    save: (data) => data instanceof FormData
      ? request('/admissions/saveApplication.php', { method: 'POST', body: data })
      : json('POST', '/admissions/saveApplication.php', data),
    getDocument: async (documentId) => {
      const url = resolveApiRequestUrl(`/admissions/getApplicationDocument.php?id=${encodeURIComponent(documentId)}`).toString();
      const headers = new Headers();
      const accessToken = getAuthToken();
      if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
      const response = await fetch(url, { headers, cache: 'no-store', credentials: 'include' });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'Unable to open the application document.');
      }
      return response.blob();
    },
    getLegacyDocument: async (applicationId, field) => {
      const query = new URLSearchParams({ application_id: applicationId, field });
      const url = resolveApiRequestUrl(`/admissions/getLegacyApplicationDocument.php?${query}`).toString();
      const headers = new Headers();
      const accessToken = getAuthToken();
      if (accessToken) headers.set('Authorization', 'Bearer ' + accessToken);
      const response = await fetch(url, { headers, cache: 'no-store', credentials: 'include' });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'Unable to open the legacy application document.');
      }
      return response.blob();
    },
    resendRecommendation: (applicationId, recommendationType) => json('POST', '/admissions/resendRecommendationInvite.php', {
      application_id: applicationId,
      recommendation_type: recommendationType,
    }),
    saveRecommendation: (data) => json('POST', '/admissions/saveRecommendation.php', data),
    markPayment: (data) => json('POST', '/admissions/markPayment.php', data),
    scheduleInterview: (data) => json('POST', '/admissions/saveInterview.php', data),
    update: (data) => json('POST', '/admissions/updateApplication.php', data),
  },

  config: {
    get: () => request('/config/getConfig.php'),
    save: (data) => json('POST', '/config/saveConfig.php', data),
  },

  students: {
    myProfile: () => request('/students/getMyProfile.php'),
    createProfileVerificationToken: () => request('/students/createProfileVerification.php', { method: 'POST', body: '{}' }),
    createAdminProfileVerificationToken: (studentId) => json('POST', '/students/createAdminProfileVerification.php', { student_id: studentId }),
    verifyStudentProfile: (token) => request(`/students/verifyStudentProfile.php?${new URLSearchParams({ token })}`),
    uploadMyAvatar: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return request('/students/uploadMyAvatar.php', { method: 'POST', body: formData });
    },
    myGrades: () => request('/students/getMyGrades.php'),
    myDataStatus: () => request('/students/getMyDataStatus.php'),
    myBilling: () => request('/students/getMyBilling.php'),
    adminPaymentLedger: () => request('/students/getAdminPaymentLedger.php'),
    adminStudentFinance: (studentId) => request(`/students/getAdminStudentFinance.php?${new URLSearchParams({ student_id: String(studentId) })}`),
    syncAdminActivityLiabilities: () => request('/students/syncAdminActivityLiabilities.php', { method: 'POST', body: '{}' }),
    sendAdminLiabilityReminder: (studentId) => json('POST', '/students/sendAdminLiabilityReminder.php', { student_id: studentId }),
    adminPaymentReceipts: (studentId) => request(`/students/getAdminPaymentReceipts.php?${new URLSearchParams({ student_id: String(studentId) })}`),
    createAdminManualPayment: (formData) => request('/students/createAdminManualPayment.php', { method: 'POST', body: formData }),
    initiateAdminPayment: (data) => json('POST', '/students/initiateAdminPayment.php', data),
    verifyAdminPayment: (transactionId, reference) => request(`/students/verifyAdminPayment.php?${new URLSearchParams({ transaction_id: transactionId, tx_ref: reference })}`),
    updateAdminPaymentStatus: (formData) => request('/students/updateAdminPaymentStatus.php', { method: 'POST', body: formData }),
    adminPaymentReceiptFile: (paymentId, disposition = 'attachment') => requestBlob(`/students/getAdminPaymentReceiptFile.php?${new URLSearchParams({ payment_id: String(paymentId), disposition })}`),
    savePaymentReceipt: (formData) => request('/payments/savePaymentReceipt.php', { method: 'POST', body: formData }),
    paymentReceiptFile: (token, disposition = 'attachment') => requestBlob(`/payments/getPaymentReceiptFile.php?${new URLSearchParams({ token, disposition })}`),
    initiateMyPayment: (amount) => json('POST', '/students/initiateMyPayment.php', { amount }),
    initiateLiabilityPayment: (chargeId) => json('POST', '/students/initiateLiabilityPayment.php', { charge_id: chargeId }),
    myActivityRequests: () => request('/students/getMyActivityRequests.php'),
    requestActivityAccess: (formData) => request('/students/requestActivityAccess.php', { method: 'POST', body: formData }),
    initiateAssessmentPayment: (data) => json('POST', '/students/initiateAssessmentPayment.php', data),
    cancelAssessmentPayment: (reference) => json('POST', '/students/cancelAssessmentPayment.php', { reference }),
    verifyMyPayment: (transactionId, reference) => request(`/students/verifyMyPayment.php?${new URLSearchParams({ transaction_id: transactionId, tx_ref: reference })}`),
    verifyPaymentReceipt: (token) => request(`/students/verifyPaymentReceipt.php?${new URLSearchParams({ token })}`),
    list: (params = {}) => request(`/students/getStudents.php?${new URLSearchParams(params)}`),
    adminRoster: () => request('/students/getAdminRoster.php'),
    communicationFollowups: () => request('/students/getAdminCommunicationFollowups.php'),
    get: (id) => request(`/students/single.php?id=${encodeURIComponent(id)}`),
    create: (data) => json('POST', '/students/addStudent.php', data),
    update: (data) => json('POST', '/students/updateStudent.php', data),
    remove: (student_id) => json('POST', '/students/deleteStudent.php', { student_id }),
    bulkCreate: (students) => json('POST', '/students/bulkAddStudents.php', { students }),
    bulkRemove: (student_ids) => json('POST', '/students/bulkDeleteStudents.php', { student_ids }),
  },

  people: {
    list: (params = {}) => request(`/staff/getPeople.php?${new URLSearchParams(params)}`),
    get: (id) => request(`/staff/getPeople.php?id=${encodeURIComponent(id)}`),
    get: (id) => request(`/staff/getPeople.php?id=${encodeURIComponent(id)}`),
    save: (data) => json('POST', '/staff/savePerson.php', data),
    remove: (id) => json('POST', '/staff/deletePerson.php', { id }),
  },

  courses: {
    list: () => request('/courses/getCourses.php'),
    publicList: () => request('/courses/getPublicCourses.php', {}, { redirectOnUnauthorized: false }),
    adminPublicList: () => request('/courses/getPublicCourses.php?admin=1'),
    savePublicCourse: (data) => json('POST', '/courses/savePublicCourse.php', data),
    removePublicCourse: (id) => json('POST', '/courses/deletePublicCourse.php', { id }),
    content: (courseId) => request(`/courses/getCourseContent.php?course_id=${encodeURIComponent(courseId)}`),
    studentCatalog: () => request('/courses/getStudentCourses.php'),
    studentSchedule: () => request('/courses/getStudentSchedule.php'),
    studentUpcomingAssessments: () => request('/courses/getStudentUpcomingAssessments.php'),
    assessmentQuestions: (courseId, assessmentId) => request(`/courses/getAssessmentQuestions.php?${new URLSearchParams({ course_id: courseId, assessment_id: String(assessmentId) })}`),
    studentQuiz: (courseId, quizId) => request(`/courses/getStudentQuiz.php?${new URLSearchParams({ course_id: courseId, quiz_id: quizId })}`),
    startStudentQuiz: (data) => json('POST', '/courses/startStudentQuiz.php', data),
    submitStudentQuiz: (data) => json('POST', '/courses/submitStudentQuiz.php', data),
    studentAssignment: (courseId, assignmentId) => request(`/courses/getStudentAssignment.php?${new URLSearchParams({ course_id: courseId, assignment_id: assignmentId })}`),
    myAssignments: () => request('/courses/getMyAssignments.php'),
    saveStudentAssignment: (data) => json('POST', '/courses/saveStudentAssignment.php', data),
    selfEnroll: (data) => json('POST', '/courses/enrollStudent.php', data),
    courseLecturers: (courseId) => request(`/courses/getCourseLecturers.php?${new URLSearchParams({ course_id: String(courseId) })}`),
    saveCourseLecturers: (data) => json('POST', '/courses/saveCourseLecturers.php', data),
    lecturerAssignments: (params = {}) => request(`/courses/getLecturerAssignments.php?${new URLSearchParams(params)}`),
    saveLecturerAssignmentGrade: (data) => json('POST', '/courses/saveLecturerAssignmentGrade.php', data),
    checkAssignmentWithAI: (data) => json('POST', '/courses/checkAssignmentWithAI.php', data),
    lecturerRoster: () => request('/courses/getLecturerRoster.php'),
    lecturerSchedule: () => request('/courses/getLecturerSchedule.php'),
    lecturerGrades: () => request('/courses/getLecturerGrades.php'),
    saveAssessment: (data) => json('POST', '/courses/saveAssessment.php', data),
    removeAssessment: (data) => json('POST', '/courses/deleteAssessment.php', data),
    activityProgress: (courseId, type, activityId) => request(`/courses/getActivityProgress.php?${new URLSearchParams({ course_id: courseId, activity_type: type, activity_id: String(activityId) })}`),
    reopenActivity: (data) => json('POST', '/courses/reopenActivity.php', data),
    create: (data) => json('POST', '/courses/addCourse.php', data),
    update: (data) => json('POST', '/courses/updateCourse.php', data),
    remove: (id) => json('POST', '/courses/deleteCourse.php', { id }),
    schedules: () => request('/schedules/getSchedules.php'),
    syncSchedules: (data) => json('POST', '/schedules/syncSchedules.php', data),
    removeSchedule: (id) => json('POST', '/schedules/deleteSchedule.php', { id }),
    addSession: (data) => json('POST', '/schedules/Addsession.php', data),
    updateSession: (data) => json('POST', '/schedules/Updatesession.php', data),
    removeSession: (id) => json('POST', '/schedules/Deletesession.php', { id }),
  },

  attendance: {
    list: () => request('/logs/getLogs.php'),
    publicSlipOptions: () => request('/attendance/getPublicSlipOptions.php', {}, { redirectOnUnauthorized: false }),
    publicSlipSession: (sessionId) => request(`/attendance/getPublicSlipSession.php?session_id=${encodeURIComponent(sessionId)}`, {}, { redirectOnUnauthorized: false }),
    publicSlipSessions: (studentId) => request(`/attendance/getPublicSlipSessions.php?student_id=${encodeURIComponent(studentId)}`, {}, { redirectOnUnauthorized: false }),
    publicSlipStudent: (studentId) => request(`/attendance/getPublicSlipStudent.php?student_id=${encodeURIComponent(studentId)}`, {}, { redirectOnUnauthorized: false }),
    submitStudentSlip: (data) => json('POST', '/attendance/submitStudentSlip.php', data, { redirectOnUnauthorized: false }),
    manageStudentSlips: (filters = {}) => {
      const query = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value) !== '') query.set(key, String(value));
      });
      const queryString = query.toString();
      return request(`/attendance/manageStudentSlips.php${queryString ? `?${queryString}` : ''}`);
    },
    studentCheckIns: (filters = {}) => {
      const query = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value) !== '') query.set(key, String(value));
      });
      const queryString = query.toString();
      return request(`/attendance/getStudentCheckIns.php${queryString ? `?${queryString}` : ''}`);
    },
    dayControl: () => request('/attendance/getDayControl.php'),
    setDayControl: (phase) => json('POST', '/attendance/setDayControl.php', { phase }),
    saveStudentCheckIn: (data) => json('POST', '/attendance/saveStudentCheckIn.php', data),
    studentAudioAccess: () => request('/attendance/getStudentAudioAccess.php'),
    create: (data) => json('POST', '/logs/addLog.php', data),
    update: (data) => json('POST', '/logs/updateLog.php', data),
    remove: (id) => json('POST', '/logs/deleteLog.php', { id }),
    courseReport: (courseId) => request(`/reports/course_attendance_report.php?course_id=${encodeURIComponent(courseId)}`),
    sessions: () => request('/attendance/getSessions.php'),
    saveSession: (data) => json('POST', '/attendance/saveSession.php', data),
    removeSession: (id) => json('POST', '/attendance/deleteSession.php', { id }),
    statuses: (sessionId) => request(`/attendance/getStatuses.php${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''}`),
    saveStatus: (data) => json('POST', '/attendance/saveStatus.php', data),
    removeStatus: (id) => json('POST', '/attendance/deleteStatus.php', { id }),
    syncMissedFollowups: (items) => json('POST', '/attendance/syncMissedFollowups.php', { items }),
    myFollowup: (id) => request(`/attendance/getMyFollowup.php?id=${encodeURIComponent(id)}`),
    submitMyFollowup: (formData) => request('/attendance/submitMyFollowup.php', { method: 'POST', body: formData }),
    followups: () => request('/attendance/getFollowups.php'),
    saveFollowup: (data) => json('POST', '/attendance/saveFollowup.php', data),
    followupSickNote: (id) => requestBlob(`/attendance/getFollowupSickNote.php?id=${encodeURIComponent(id)}`),
  },

  events: {
    list: () => request('/events/getEvents.php'),
    save: (data) => json('POST', '/events/saveEvent.php', data),
    remove: (id) => json('POST', '/events/deleteEvent.php', { id }),
    startRegistration: (data) => json('POST', '/events/startRegistrationPayment.php', data),
    verifyRegistrationPayment: (transactionId, reference) => request(`/events/verifyRegistrationPayment.php?transaction_id=${encodeURIComponent(transactionId)}&tx_ref=${encodeURIComponent(reference)}`),
    cancelRegistrationPayment: (reference) => json('POST', '/events/cancelRegistrationPayment.php', { payment_reference: reference }),
    confirmRegistration: (data) => json('POST', '/events/confirmRegistration.php', data),
  },

  finance: {
    budgets: () => request('/budgets/getBudgets.php'),
    saveBudget: (data) => json('POST', '/budgets/saveBudget.php', data),
    removeBudget: (id) => json('POST', '/budgets/deleteBudget.php', { id }),
    expenditures: () => request('/expenditures/getExpenditures.php'),
    saveExpenditure: (data) => json('POST', '/expenditures/saveExpenditure.php', data),
    removeExpenditure: (id) => json('POST', '/expenditures/deleteExpenditure.php', { id }),
  },

  assets: {
    list: () => request('/assets/getAssets.php'),
    save: (data) => json('POST', '/assets/saveAsset.php', data),
  },

  activityRequests: {
    list: () => request('/activity-requests/getRequests.php'),
    save: (data) => json('POST', '/activity-requests/saveRequest.php', data),
    invoice: (id) => requestBlob(`/activity-requests/getInvoice.php?id=${encodeURIComponent(id)}`),
    emailInvoice: (requestId) => json('POST', '/activity-requests/sendInvoiceEmail.php', { request_id: requestId }),
    sickNote: (id) => requestBlob(`/activity-requests/getSickNote.php?id=${encodeURIComponent(id)}`),
  },

  socialMedia: {
    posts: () => request('/social-media/getPosts.php'),
    assignees: () => request('/social-media/getAssignees.php'),
    save: (data) => json('POST', '/social-media/savePost.php', data),
    remove: (id) => json('POST', '/social-media/deletePost.php', { id }),
    upload: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return request('/social-media/uploadMedia.php', { method: 'POST', body: formData });
    },
  },

  partnerships: {
    submitApplication: (data) => json('POST', '/partnerships/index.php', data, { redirectOnUnauthorized: false }),
    applications: () => request('/partnerships/index.php'),
    reviewApplication: (data) => request('/partnerships/index.php', { method: 'PUT', body: JSON.stringify(data) }),
  },

  tasks: {
    list: () => request('/tasks/index.php'),
    create: (data) => json('POST', '/tasks/index.php', { action: 'create', ...data }),
    update: (data) => json('POST', '/tasks/index.php', { action: 'update', ...data }),
    remove: (id) => json('POST', '/tasks/index.php', { action: 'delete', id }),
  },

  audio: {
    myResources: () => request('/audio/getMyResources.php'),
    downloadMyAudio: (audioId) => requestBlob(`/audio/downloadMyAudio.php?audio_id=${encodeURIComponent(audioId)}`),
    initiateStudentPurchase: (data) => json('POST', '/audio/initiateStudentPurchase.php', data),
    verifyStudentPurchase: (transactionId, reference) => request(`/audio/verifyStudentPurchase.php?${new URLSearchParams({ transaction_id: transactionId, tx_ref: reference })}`),
    resources: () => request('/audio/getResources.php'),
    saveResource: (data) => json('POST', '/audio/saveResource.php', data),
    updateResource: (data) => json('POST', '/audio/updateResource.php', data),
    removeResource: (id) => json('POST', '/audio/deleteResource.php', { id }),
  },

  library: {
    myResources: () => request('/library/getMyResources.php'),
    list: () => request('/library/getResources.php'),
    resourceOptions: () => request('/library/getResourceOptions.php'),
    studentResources: (courseId) => request(`/library/getStudentResources.php?course_id=${encodeURIComponent(courseId)}`),
    save: (data) => json('POST', '/library/saveResource.php', data),
    remove: (id) => json('POST', '/library/deleteResource.php', { id }),
    readingProgress: (courseId) => request(`/library/getReadingProgress.php?course_id=${encodeURIComponent(courseId)}`),
    saveReadingProgress: (data) => json('POST', '/library/saveReadingProgress.php', data),
    upload: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return request('/library/upload.php', { method: 'POST', body: formData });
    },
  },

  registrations: {
    list: (eventId) => request(`/registrations/getRegistrations.php${eventId ? `?event_id=${encodeURIComponent(eventId)}` : ''}`),
    save: (data) => json('POST', '/registrations/saveRegistration.php', data),
    remove: (id) => json('POST', '/registrations/deleteRegistration.php', { id }),
    updateAttendance: (id, attendanceStatus) => json('POST', '/registrations/updateAttendance.php', { id, attendance_status: attendanceStatus }),
  },

  orders: {
    list: () => request('/orders/getOrders.php'),
    save: (data) => json('POST', '/orders/saveOrder.php', data),
    remove: (id) => json('POST', '/orders/deleteOrder.php', { id }),
  },

  store: {
    list: () => request('/store/getProducts.php'),
    save: (data) => json('POST', '/store/saveProduct.php', data),
    remove: (id) => json('POST', '/store/deleteProduct.php', { id }),
  },

  uploads: {
    image: async (file, folder = 'general') => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      return request('/upload.php', { method: 'POST', body: formData });
    },
  },

  purchases: {
    list: (params = {}) => request(`/store/getPurchases.php?${new URLSearchParams(params)}`),
    get: (reference) => request(`/store/getPurchase.php?reference=${encodeURIComponent(reference)}`),
    create: (data) => json('POST', '/store/createPurchase.php', data),
    verifyPayment: (transactionId, reference) => request(`/store/verifyPurchasePayment.php?${new URLSearchParams({ transaction_id: transactionId, tx_ref: reference })}`),
    cancelPending: (reference) => json('POST', '/store/cancelPendingPurchase.php', { reference }),
    updatePaymentStatus: (reference, status) => json('POST', '/store/updatePurchasePaymentStatus.php', { reference, status }),
  },

  promotions: {
    list: (admin = false) => request(`/store/getPromotions.php${admin ? '?admin=1' : ''}`),
    save: (data) => json('POST', '/store/savePromotion.php', data),
    remove: (id) => json('POST', '/store/deletePromotion.php', { id }),
  },

  grades: {
    items: () => request('/grades/getItems.php'),
    saveItem: (data) => json('POST', '/grades/saveItem.php', data),
    removeItem: (id) => json('POST', '/grades/deleteItem.php', { id }),
    list: () => request('/grades/getGrades.php'),
    save: (data) => json('POST', '/grades/saveGrade.php', data),
    remove: (id) => json('POST', '/grades/deleteGrade.php', { id }),
  },

  moodle: {
    users: () => request('/moodle/getUsers.php'),
    saveUser: (data) => json('POST', '/moodle/saveUser.php', data),
    removeUser: (id) => json('POST', '/moodle/deleteUser.php', { id }),
    courses: () => request('/moodle/getCourses.php'),
    saveCourse: (data) => json('POST', '/moodle/saveCourse.php', data),
    removeCourse: (id) => json('POST', '/moodle/deleteCourse.php', { id }),
    categories: () => request('/moodle/getCategories.php'),
    saveCategory: (data) => json('POST', '/moodle/saveCategory.php', data),
    removeCategory: (id) => json('POST', '/moodle/deleteCategory.php', { id }),
  },

  alerts: {
    list: () => request('/logs/getAlerts.php'),
    create: (data) => json('POST', '/logs/addAlert.php', data),
    markRead: (id) => json('POST', '/logs/markAlertRead.php', { id }),
    markAllRead: () => json('POST', '/logs/markAllAlertsRead.php', {}),
    purge: () => json('POST', '/logs/purgeAlerts.php', {}),
    purgeLogs: () => json('POST', '/logs/purgeLogs.php', {}),
  },

  activityLogs: {
    list: (filters = {}) => {
      const query = new URLSearchParams({
        limit: String(filters.limit || 50),
        offset: String(filters.offset || 0),
        status: filters.status || 'all',
        actor_role: filters.actor_role || 'all',
        search: filters.search || '',
      });
      return request(`/api/activity-logs?${query}`, {}, { redirectOnUnauthorized: false, sameOrigin: true });
    },
  },

  websiteAnalytics: {
    dashboard: (days = 30) => request(
      `/api/site-analytics?days=${encodeURIComponent(String(days))}`,
      {},
      { redirectOnUnauthorized: false, sameOrigin: true },
    ),
  },

  chatbot: {
    publicConfig: () => request('/chatbot/getPublicConfig.php'),
    interact: (data) => request('/chatbot/interact.php', {
      method: 'POST',
      body: JSON.stringify(data),
      keepalive: data.event_type === 'action',
    }),
    submitLead: (data) => json('POST', '/chatbot/submitLead.php', data),
    adminData: () => request('/chatbot/getAdminData.php'),
    contactMessages: () => request('/chatbot/getContactMessages.php'),
    saveResponse: (data) => json('POST', '/chatbot/saveResponse.php', data),
    saveSettings: (data) => json('POST', '/chatbot/saveSettings.php', data),
    updateLead: (id, status) => json('POST', '/chatbot/updateLead.php', { id, status }),
    replyToLead: (leadId, reply) => json('POST', '/chatbot/replyToLead.php', { lead_id: leadId, reply }),
  },

  helpDesk: {
    list: () => request('/help-desk/index.php'),
    create: (data) => json('POST', '/help-desk/index.php', { action: 'create', ...data }),
    updateStatus: (id, status) => json('POST', '/help-desk/index.php', { action: 'updateStatus', id, status }),
    reply: (id, message) => json('POST', '/help-desk/index.php', { action: 'reply', id, message }),
  },

  adminReports: {
    list: () => request('/admin-reports/index.php'),
    notifications: () => request('/admin-reports/index.php?action=notifications'),
    markNotificationRead: (id) => json('POST', '/admin-reports/index.php', { action: 'mark_notification_read', id }),
    create: (data) => json('POST', '/admin-reports/index.php', { action: 'create', ...data }),
    view: (id) => request('/admin-reports/index.php', { method: 'POST', body: JSON.stringify({ action: 'view', id }) }),
  },

  siteContent: {
    publicAbout: () => request('/site-content/getAboutContent.php', {}, { redirectOnUnauthorized: false }),
    adminAbout: () => request('/site-content/getAboutContent.php?admin=1'),
    pageContent: (query) => request(`/site-content/getPageContent.php?${query}`, {}, { redirectOnUnauthorized: false }),
    adminPageContent: () => request('/site-content/getPageContent.php?admin=1'),
    savePageContent: (data) => json('POST', '/site-content/savePageContent.php', data),
    saveAbout: (data) => json('POST', '/site-content/saveAboutContent.php', data),
    savePerson: (data) => json('POST', '/site-content/saveAboutPerson.php', data),
    deletePerson: (kind, id) => json('POST', '/site-content/deleteAboutPerson.php', { kind, id }),
    submitTestimony: (formData) => request('/site-content/submitTestimony.php', { method: 'POST', body: formData }, { redirectOnUnauthorized: false }),
    reviewTestimonySubmission: (data) => json('POST', '/site-content/reviewTestimonySubmission.php', data),
    sendTestimonyInvite: (email) => json('POST', '/site-content/sendTestimonyInvite.php', { email }),
    validateTestimonyInvite: (token) => request(`/site-content/validateTestimonyInvite.php?${new URLSearchParams({ token })}`, {}, { redirectOnUnauthorized: false }),
  },

  terms: {
    list: () => request('/academic-terms/getTerms.php'),
    save: (data) => json('POST', '/academic-terms/saveTerm.php', data),
    remove: (termId) => json('POST', '/academic-terms/deleteTerm.php', { term_id: termId }),
  },

  serviceHours: {
    list: (params = {}) => request(`/church-service-hours/getHours.php?${new URLSearchParams(params)}`),
    myHours: (params = {}) => request(`/church-service-hours/getMyHours.php?${new URLSearchParams(params)}`),
    save: (data) => json('POST', '/church-service-hours/saveHours.php', data),
    remove: (id) => json('POST', '/church-service-hours/deleteHour.php', { id }),
  },
};

export { API_BASE_URL };