export type StudentGrade = {
  course_id: string;
  course_name: string;
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
