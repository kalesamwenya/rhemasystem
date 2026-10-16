/**
 * Server-side Moodle Web Services client.
 *
 * This module is intentionally not connected to the application yet. Create a
 * client in a server-side integration when Moodle is ready to be enabled:
 *
 *   const moodle = createMoodleClient({ baseUrl, token });
 *   const courses = await moodle.getCourses();
 *
 * Never pass the token to a browser component or expose it through NEXT_PUBLIC_*
 * environment variables.
 */

export type MoodlePrimitive = string | number | boolean | null | undefined;
export type MoodleValue = MoodlePrimitive | MoodleValue[] | { [key: string]: MoodleValue };
export type MoodleParams = Record<string, MoodleValue>;

export type MoodleConfig = {
  baseUrl: string;
  token: string;
  timeoutMs?: number;
};

export type MoodleUser = {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  fullname?: string;
  email: string;
  phone1?: string;
  suspended?: number;
};

export type MoodleCourse = {
  id: number;
  fullname: string;
  shortname: string;
  idnumber?: string;
  summary?: string;
  categoryid?: number;
  visible?: number;
  startdate?: number;
  enddate?: number;
};

export type MoodleEnrolment = {
  id: number;
  courseid: number;
  userid: number;
  status: number;
  timestart?: number;
  timeend?: number;
};

export type MoodleGrade = {
  id?: number;
  itemname?: string;
  itemtype?: string;
  grademax?: number;
  grademin?: number;
  grade?: number | null;
  feedback?: string | null;
};

export type MoodleAssignment = {
  id: number;
  cmid?: number;
  course: number;
  name: string;
  intro?: string;
  duedate?: number;
  allowsubmissionsfromdate?: number;
  grade?: number;
};

type MoodleErrorResponse = {
  exception?: string;
  errorcode?: string;
  message?: string;
  debuginfo?: string;
};

const DEFAULT_TIMEOUT_MS = 20_000;

function appendParameter(search: URLSearchParams, key: string, value: unknown): void {
  if (value === undefined || value === null) return;

  if (Array.isArray(value)) {
    value.forEach((item, index) => appendParameter(search, `${key}[${index}]`, item));
    return;
  }

  if (typeof value === "object") {
    Object.entries(value).forEach(([childKey, childValue]) => appendParameter(search, `${key}[${childKey}]`, childValue));
    return;
  }

  search.append(key, String(value));
}

function encodeParams(params: MoodleParams): URLSearchParams {
  const encoded = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => appendParameter(encoded, key, value));
  return encoded;
}

function validateConfig(config: MoodleConfig): MoodleConfig {
  const baseUrl = config.baseUrl.trim().replace(/\/$/, "");
  const token = config.token.trim();

  if (!baseUrl) throw new Error("Moodle baseUrl is required.");
  if (!token) throw new Error("Moodle token is required.");

  return { ...config, baseUrl, token, timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS };
}

export class MoodleApiError extends Error {
  readonly functionName: string;
  readonly errorCode?: string;
  readonly debugInfo?: string;

  constructor(functionName: string, response: MoodleErrorResponse) {
    super(response.message ?? `Moodle request ${functionName} failed.`);
    this.name = "MoodleApiError";
    this.functionName = functionName;
    this.errorCode = response.errorcode;
    this.debugInfo = response.debuginfo;
  }
}

export class MoodleClient {
  private readonly config: MoodleConfig;

  constructor(config: MoodleConfig) {
    this.config = validateConfig(config);
  }

  async call<TResponse>(functionName: string, params: MoodleParams = {}): Promise<TResponse> {
    const payload = encodeParams({
      ...params,
      wstoken: this.config.token,
      wsfunction: functionName,
      moodlewsrestformat: "json",
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}/webservice/rest/server.php`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: payload.toString(),
        signal: controller.signal,
        cache: "no-store",
      });

      const body = await response.json() as TResponse & MoodleErrorResponse;
      if (!response.ok || body.exception) throw new MoodleApiError(functionName, body);
      return body as TResponse;
    } catch (error) {
      if (error instanceof MoodleApiError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error(`Moodle request ${functionName} timed out.`);
      }
      throw new Error(`Moodle request ${functionName} failed: ${error instanceof Error ? error.message : "unknown error"}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  getUsers(criteria: Array<{ key: string; value: string }>): Promise<{ users: MoodleUser[]; total: number }> {
    return this.call("core_user_get_users", { "criteria": criteria });
  }

  getUserByUsername(username: string): Promise<{ users: MoodleUser[]; total: number }> {
    return this.getUsers([{ key: "username", value: username }]);
  }

  getCourses(options: { ids?: number[]; categoryid?: number } = {}): Promise<MoodleCourse[]> {
    return this.call<MoodleCourse[]>("core_course_get_courses", options);
  }

  getCourseContents(courseId: number, options: { options?: Record<string, MoodleValue> } = {}): Promise<unknown[]> {
    return this.call<unknown[]>("core_course_get_contents", { courseid: courseId, ...options });
  }

  getEnrolledUsers(courseId: number, options: { options?: Record<string, MoodleValue> } = {}): Promise<MoodleUser[]> {
    return this.call<MoodleUser[]>("core_enrol_get_enrolled_users", { courseid: courseId, ...options });
  }

  enrolUsers(enrolments: Array<{ roleid: number; userid: number; courseid: number; timestart?: number; timeend?: number }>): Promise<unknown> {
    return this.call("enrol_manual_enrol_users", { enrolments });
  }

  getGrades(courseId: number, userId?: number): Promise<unknown> {
    return this.call("core_grades_get_grades", {
      courseids: [courseId],
      ...(userId === undefined ? {} : { userids: [userId] }),
    });
  }

  getAssignments(courseIds: number[] = []): Promise<{ courses: Array<{ id: number; assignments: MoodleAssignment[] }> }> {
    return this.call("mod_assign_get_assignments", { ...(courseIds.length ? { courseids: courseIds } : {}) });
  }

  getSiteInfo(): Promise<Record<string, unknown>> {
    return this.call("core_webservice_get_site_info");
  }
}

export function createMoodleClient(config: MoodleConfig): MoodleClient {
  return new MoodleClient(config);
}

export function createMoodleClientFromEnv(): MoodleClient {
  const baseUrl = process.env.MOODLE_BASE_URL;
  const token = process.env.MOODLE_TOKEN;
  if (!baseUrl || !token) throw new Error("Set MOODLE_BASE_URL and MOODLE_TOKEN before creating the Moodle client.");
  return createMoodleClient({ baseUrl, token, timeoutMs: Number(process.env.MOODLE_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS });
}
