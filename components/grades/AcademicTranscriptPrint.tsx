import Image from 'next/image';
import {
  calculateGpa,
  summarizeCourseGrades,
  type StudentGrade,
} from '@/lib/student-grades';

type TranscriptStudent = {
  student_id: string;
  name: string;
  class: string;
};

export default function AcademicTranscriptPrint({
  student,
  grades,
}: {
  student: TranscriptStudent;
  grades: StudentGrade[];
}) {
  const courses = summarizeCourseGrades(grades);
  const levelOneCourses = courses.filter((course) => course.academic_level === 1);
  const levelTwoCourses = courses.filter((course) => course.academic_level === 2);
  const cumulativeGpa = calculateGpa(courses);
  const levelOneGpa = calculateGpa(courses, 1);
  const levelTwoGpa = calculateGpa(courses, 2);

  const levelRows = (level: 1 | 2) => courses.filter((course) => course.academic_level === level).map((course) => (
    <tr key={course.course_id}>
      <td>{course.course_name}</td>
      <td>{course.course_sessions}</td>
      <td>{course.course_hours.toFixed(2)}</td>
      <td>{course.percentage === null ? 'Pending' : `${course.percentage.toFixed(2)}%`}</td>
      <td>{course.letter_grade ?? '—'}</td>
      <td>{course.grade_points === null ? '—' : course.grade_points.toFixed(1)}</td>
    </tr>
  ));

  return (
    <div className="transcript-print-root" aria-hidden="true">
      <style jsx global>{`
        .transcript-print-root { display: none; }
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body * { visibility: hidden !important; }
          .transcript-print-root,
          .transcript-print-root * { visibility: visible !important; }
          .transcript-print-root {
            display: block !important;
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            color: #172a3a !important;
            font-family: Arial, Helvetica, sans-serif !important;
          }
          .transcript-page {
            box-sizing: border-box;
            min-height: 270mm;
            padding: 3mm;
            break-after: page;
            page-break-after: always;
          }
          .transcript-page:last-child { break-after: auto; page-break-after: auto; }
          .transcript-heading { border-bottom: 3px solid #c8102e; padding-bottom: 12px; }
          .transcript-heading h1 { margin: 0; font-size: 22px; letter-spacing: 1.5px; }
          .transcript-heading p { margin: 5px 0 0; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
          .transcript-student { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; margin: 18px 0; font-size: 11px; }
          .transcript-student strong { display: inline-block; min-width: 90px; }
          .transcript-level { margin-top: 16px; }
          .transcript-level h2 { margin: 0 0 6px; font-size: 13px; }
          .transcript-table { width: 100%; border-collapse: collapse; font-size: 9px; }
          .transcript-table th, .transcript-table td { border: 1px solid #bcc7d1; padding: 6px; text-align: left; }
          .transcript-table th { background: #edf2f7 !important; }
          .transcript-table th:nth-child(n+2), .transcript-table td:nth-child(n+2) { text-align: right; }
          .transcript-gpa { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 16px; }
          .transcript-gpa div { border: 1px solid #bcc7d1; padding: 10px; text-align: center; }
          .transcript-gpa span { display: block; font-size: 9px; text-transform: uppercase; }
          .transcript-gpa strong { display: block; margin-top: 4px; font-size: 17px; }
          .transcript-note { margin-top: 14px; font-size: 9px; line-height: 1.5; }
          .transcript-back-title { margin: 20px 0 8px; font-size: 16px; }
          .transcript-scale { width: 100%; border-collapse: collapse; font-size: 10px; }
          .transcript-scale th, .transcript-scale td { border: 1px solid #bcc7d1; padding: 8px; text-align: left; }
          .transcript-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 70px; font-size: 10px; }
          .transcript-signatures div { border-top: 1px solid #334155; padding-top: 8px; }
          .transcript-verification { margin-top: 36px; border: 1px solid #bcc7d1; padding: 12px; font-size: 9px; line-height: 1.5; }
        }
      `}</style>

      <section className="transcript-page">
        <header className="transcript-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Image src="/emit-academy-mark.svg" alt="Emit Academy" width={48} height={52} />
            <div>
              <h1>ACADEMIC TRANSCRIPT</h1>
              <p>Emit Academy</p>
            </div>
          </div>
        </header>
        <div className="transcript-student">
          <div><strong>Student name:</strong> {student.name}</div>
          <div><strong>Student ID:</strong> {student.student_id}</div>
          <div><strong>Current cohort:</strong> {student.class || '—'}</div>
          <div><strong>Issue date:</strong> {new Date().toLocaleDateString()}</div>
        </div>

        {[1, 2].map((level) => {
          const levelCourses = level === 1 ? levelOneCourses : levelTwoCourses;
          const gpa = level === 1 ? levelOneGpa : levelTwoGpa;
          return (
            <section className="transcript-level" key={level}>
              <h2>Level {level} · {level === 1 ? 'First Year' : 'Second Year'} · GPA {gpa === null ? '—' : gpa.toFixed(2)}</h2>
              {levelCourses.length ? (
                <table className="transcript-table">
                  <thead><tr><th>Course</th><th>Sessions</th><th>Hours</th><th>Percentage</th><th>Grade</th><th>Points</th></tr></thead>
                  <tbody>{level === 1 ? levelRows(1) : levelRows(2)}</tbody>
                </table>
              ) : <p className="transcript-note">No course results recorded for this level.</p>}
            </section>
          );
        })}

        <div className="transcript-gpa">
          <div><span>Level 1 GPA</span><strong>{levelOneGpa === null ? '—' : levelOneGpa.toFixed(2)}</strong></div>
          <div><span>Level 2 GPA</span><strong>{levelTwoGpa === null ? '—' : levelTwoGpa.toFixed(2)}</strong></div>
          <div><span>Cumulative GPA</span><strong>{cumulativeGpa === null ? '—' : cumulativeGpa.toFixed(2)}</strong></div>
        </div>
        <p className="transcript-note">
          GPA is calculated as the equal-weighted average of published course grade points. Courses without a published final grade are excluded until finalized.
          {courses.some((course) => course.grade === null) ? ` ${courses.filter((course) => course.grade === null).length} course result(s) are pending.` : ''}
        </p>
      </section>

      <section className="transcript-page">
        <header className="transcript-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Image src="/emit-academy-mark.svg" alt="Emit Academy" width={48} height={52} />
            <div><h1>GRADING &amp; VERIFICATION</h1><p>Academic transcript · {student.student_id}</p></div>
          </div>
        </header>
        <h2 className="transcript-back-title">Grading scale · 4.0 GPA</h2>
        <table className="transcript-scale">
          <thead><tr><th>Letter grade</th><th>Percentage</th><th>Grade points</th><th>Standing</th></tr></thead>
          <tbody>
            <tr><td>A</td><td>80–100%</td><td>4.0</td><td>Excellent</td></tr>
            <tr><td>B</td><td>70–79.99%</td><td>3.0</td><td>Very good</td></tr>
            <tr><td>C</td><td>60–69.99%</td><td>2.0</td><td>Good</td></tr>
            <tr><td>D</td><td>50–59.99%</td><td>1.0</td><td>Pass</td></tr>
            <tr><td>F</td><td>Below 50%</td><td>0.0</td><td>Fail</td></tr>
          </tbody>
        </table>
        <p className="transcript-note">
          The percentage for each course is normalized to its published grade range. Each course contributes equally to the GPA; scheduled hours are reported separately and are not GPA weighting units. Level 1 includes first-year courses (FYM/FYE cohorts); Level 2 includes second-year courses (SYM/SYE cohorts).
        </p>
        <div className="transcript-signatures">
          <div>Academic Dean / Authorized Officer</div>
          <div>Registrar</div>
        </div>
        <div className="transcript-verification">
          This transcript is an official record only when issued and signed by an authorized Emit Academy officer. For verification, contact the Emit Academy Registrar and provide the student ID printed on the front page.
        </div>
      </section>
    </div>
  );
}
