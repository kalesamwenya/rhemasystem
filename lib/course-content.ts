import { api } from '@/lib/api';

export type CourseQuiz = {
  id: number;
  assessment_type: 'quiz' | 'exam';
  name: string;
  intro: string;
  idnumber: string;
  timeopen: number;
  timeclose: number;
  timelimit: number;
  grade: number;
  question_count: number;
  attempts: number;
};

export type CourseAssignment = {
  id: number;
  name: string;
  intro: string;
  idnumber: string;
  allowsubmissionsfromdate: number;
  duedate: number;
  grade: number;
  submission_type: string;
  grading_rubric: GradingCriterion[];
};

export type CourseContent = {
  course: { id: string; name: string; description: string };
  quizzes: CourseQuiz[];
  exams: CourseQuiz[];
  assignments: CourseAssignment[];
};

type CourseContentResponse = {
  success?: boolean;
  message?: string;
  data?: CourseContent;
};

export async function requestCourseContent(courseId: string): Promise<CourseContent> {
  const response = await api.courses.content(courseId) as CourseContentResponse;
  if (!response.success || !response.data) {
    throw new Error(response.message ?? 'Unable to load course materials and assessments.');
  }
  return response.data;
}

export type AssessmentDraft = {
  id?: number;
  name: string;
  intro: string;
  grade: number;
  timeopen: string;
  timeclose: string;
  timelimit: number;
  attempts: number;
  question_count: number;
  allowsubmissionsfromdate: string;
  duedate: string;
  submission_type: 'file' | 'online';
  questions: AssessmentQuestionDraft[];
  rubric: GradingCriterion[];
};

export type AssessmentQuestionDraft = {
  id?: number;
  question: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  correct_option: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  points: number;
};

export type GradingCriterion = {
  name: string;
  description: string;
  points: number;
};

export type CourseAssessmentKind = 'quiz' | 'exam' | 'assignment';

type SaveAssessmentResponse = {
  success?: boolean;
  message?: string;
};

type AssessmentQuestionsResponse = {
  success?: boolean;
  message?: string;
  data?: { questions: AssessmentQuestionDraft[] };
};

export async function requestAssessmentQuestions(courseId: string, assessmentId: number): Promise<AssessmentQuestionDraft[]> {
  const response = await api.courses.assessmentQuestions(courseId, assessmentId) as AssessmentQuestionsResponse;
  if (!response.success || !response.data) {
    throw new Error(response.message ?? 'Unable to load the assessment grading matrix.');
  }
  return response.data.questions;
}

export async function saveCourseAssessment(courseId: string, kind: CourseAssessmentKind, assessment: AssessmentDraft): Promise<void> {
  const response = await api.courses.saveAssessment({ course_id: courseId, kind, assessment }) as SaveAssessmentResponse;
  if (!response.success) throw new Error(response.message ?? 'Unable to save course assessment.');
}

export async function deleteCourseAssessment(courseId: string, kind: CourseAssessmentKind, id: number): Promise<void> {
  const response = await api.courses.removeAssessment({ course_id: courseId, kind, id }) as SaveAssessmentResponse;
  if (!response.success) throw new Error(response.message ?? 'Unable to delete course assessment.');
}
