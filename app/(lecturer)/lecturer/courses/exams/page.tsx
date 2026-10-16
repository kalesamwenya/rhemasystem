export default function LecturerExamsPage() {
  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">Assessment hub</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Course Exams</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-lg font-bold text-slate-900">Upcoming examinations</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Review scheduled exams and coordinate the delivery of assessments for each class.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-lg font-bold text-slate-900">Exam controls</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Configure exam settings, review rubrics, and support student submissions efficiently.
          </p>
        </div>
      </div>
    </div>
  );
}
