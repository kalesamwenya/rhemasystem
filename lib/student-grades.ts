export type StudentGrade = {
  course_id: string;
  course_name: string;
  cohort_name?: string;
  academic_level?: 1 | 2 | null;
  session_period?: 'morning' | 'evening';
  course_sessions?: number;
  course_hours?: number;
  scheduled_sessions?: number;
  scheduled_hours?: number;
  session_count_override?: number | null;
  course_hours_override?: number | null;
  item_name: string;
  item_type: string;
  item_module: string | null;
  minimum_grade?: number;
  maximum_grade: number;
  grade: number | null;
  feedback: string;
};

export type GradeSummary = {
  earned: number;
  possible: number;
  percentage: number | null;
  gradedActivityCount: number;
  activityCount: number;
};

export type CourseGradeSummary = {
  course_id: string;
  course_name: string;
  academic_level: 1 | 2 | null;
  cohort_name: string;
  session_period: string;
  course_sessions: number;
  course_hours: number;
  scheduled_sessions: number;
  scheduled_hours: number;
  session_count_override: number | null;
  course_hours_override: number | null;
  minimum_grade: number;
  maximum_grade: number;
  grade: number | null;
  percentage: number | null;
  letter_grade: string | null;
  grade_points: number | null;
};

const gradeBands = [
  { minimum: 80, letter: 'A', points: 4 },
  { minimum: 70, letter: 'B', points: 3 },
  { minimum: 60, letter: 'C', points: 2 },
  { minimum: 50, letter: 'D', points: 1 },
] as const;

export function isActivityGrade(grade: StudentGrade) {
  return grade.item_type.toLowerCase() === 'mod' && Boolean(grade.item_module);
}

export function summarizeGrades(grades: StudentGrade[]): GradeSummary {
  const minimumGrade = (grade: StudentGrade) => grade.minimum_grade ?? 0;
  const gradedActivities = grades.filter((grade) =>
    isActivityGrade(grade)
    && grade.grade !== null
    && Number.isFinite(grade.grade)
    && Number.isFinite(grade.maximum_grade)
    && grade.maximum_grade > minimumGrade(grade),
  );
  const earned = gradedActivities.reduce((total, grade) => total + ((grade.grade ?? minimumGrade(grade)) - minimumGrade(grade)), 0);
  const possible = gradedActivities.reduce((total, grade) => total + (grade.maximum_grade - minimumGrade(grade)), 0);
  return {
    earned,
    possible,
    percentage: possible > 0 ? (earned / possible) * 100 : null,
    gradedActivityCount: gradedActivities.length,
    activityCount: grades.filter(isActivityGrade).length,
  };
}

export function formatGrade(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

export function getCourseTotal(grades: StudentGrade[]) {
  return grades.find((grade) => grade.item_type.toLowerCase() === 'course') ?? null;
}

export function getGradePercentage(grade: StudentGrade) {
  const minimumGrade = grade.minimum_grade ?? 0;
  if (grade.grade === null || grade.maximum_grade <= minimumGrade) return null;
  return ((grade.grade - minimumGrade) / (grade.maximum_grade - minimumGrade)) * 100;
}

export function getLetterGrade(percentage: number) {
  return gradeBands.find((band) => percentage >= band.minimum)?.letter ?? 'F';
}

export function getGradePoints(percentage: number) {
  return gradeBands.find((band) => percentage >= band.minimum)?.points ?? 0;
}

export function summarizeCourseGrades(grades: StudentGrade[]): CourseGradeSummary[] {
  const grouped = new Map<string, StudentGrade[]>();
  for (const grade of grades) {
    const courseGrades = grouped.get(grade.course_id) ?? [];
    courseGrades.push(grade);
    grouped.set(grade.course_id, courseGrades);
  }

  return [...grouped.entries()].map(([courseId, courseGrades]) => {
    const firstGrade = courseGrades[0];
    const total = getCourseTotal(courseGrades);
    const percentage = total ? getGradePercentage(total) : null;
    const cohort = (firstGrade.cohort_name ?? '').trim().toUpperCase();
    const level = firstGrade.academic_level
      ?? (cohort.startsWith('FY') ? 1 : cohort.startsWith('SY') ? 2 : null);
    return {
      course_id: courseId,
      course_name: firstGrade.course_name,
      academic_level: level,
      cohort_name: firstGrade.cohort_name ?? '',
      session_period: firstGrade.session_period ?? '',
      course_sessions: Number(firstGrade.course_sessions ?? 0),
      course_hours: Number(firstGrade.course_hours ?? 0),
      scheduled_sessions: Number(firstGrade.scheduled_sessions ?? firstGrade.course_sessions ?? 0),
      scheduled_hours: Number(firstGrade.scheduled_hours ?? firstGrade.course_hours ?? 0),
      session_count_override: firstGrade.session_count_override ?? null,
      course_hours_override: firstGrade.course_hours_override ?? null,
      minimum_grade: total?.minimum_grade ?? 0,
      maximum_grade: total?.maximum_grade ?? 100,
      grade: total?.grade ?? null,
      percentage,
      letter_grade: percentage === null ? null : getLetterGrade(percentage),
      grade_points: percentage === null ? null : getGradePoints(percentage),
    };
  }).sort((first, second) => first.academic_level === second.academic_level
    ? first.course_name.localeCompare(second.course_name)
    : (first.academic_level ?? 9) - (second.academic_level ?? 9));
}

export function calculateGpa(courses: CourseGradeSummary[], level?: 1 | 2) {
  const eligible = courses.filter((course) =>
    course.grade_points !== null
    && (level === undefined || course.academic_level === level),
  );
  return eligible.length
    ? eligible.reduce((total, course) => total + (course.grade_points ?? 0), 0) / eligible.length
    : null;
}
