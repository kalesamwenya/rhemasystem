import { calculateGpa, summarizeCourseGrades, type StudentGrade } from '@/lib/student-grades';

type TranscriptStudent = {
  student_id: string;
  name: string;
  class: string;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character);

async function qrDataUrl(value: string): Promise<string> {
  const { BrowserQRCodeSvgWriter } = await import('@zxing/browser');
  const svg = new BrowserQRCodeSvgWriter().write(value, 192, 192);
  const svgUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' }));
  const image = new Image();
  try {
    image.src = svgUrl;
    await image.decode();
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 384;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to prepare the transcript verification QR code.');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

async function logoDataUrl(): Promise<string> {
  const response = await fetch('/emit-academy-mark.svg');
  if (!response.ok) throw new Error('Unable to load the Emit Academy logo.');
  const svg = await response.text();
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  const image = new Image();
  try {
    image.src = svgUrl;
    await image.decode();
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to prepare the Emit Academy logo.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

function transcriptHtml(
  student: TranscriptStudent,
  grades: StudentGrade[],
  serialNumber: string,
  qrImage: string,
  logoImage: string,
): string {
  const courses = summarizeCourseGrades(grades);
  const cumulativeGpa = calculateGpa(courses);
  const levelOneGpa = calculateGpa(courses, 1);
  const levelTwoGpa = calculateGpa(courses, 2);
  const issueDate = new Date().toLocaleDateString();
  const courseRows = courses.map((course) => `
    <tr>
      <td class="code">${escapeHtml(course.course_id)}</td>
      <td>${escapeHtml(course.course_name)}</td>
      <td>${course.academic_level === null ? '—' : `Level ${course.academic_level}`}</td>
      <td>${course.percentage === null ? 'Pending' : `${course.percentage.toFixed(2)}%`}</td>
      <td class="grade">${escapeHtml(course.letter_grade ?? '—')}</td>
      <td class="grade">${course.grade_points === null ? '—' : course.grade_points.toFixed(1)}</td>
    </tr>`).join('');
  const attendanceRows = courses.map((course) => `
    <tr>
      <td class="code">${escapeHtml(course.course_id)}</td>
      <td>${escapeHtml(course.course_name)}</td>
      <td class="numeric">${course.total_sessions}</td>
      <td class="numeric">${course.attended_sessions}</td>
      <td class="numeric">${course.course_hours.toFixed(2)}</td>
    </tr>`).join('');
  const gpaValue = (value: number | null) => value === null ? '—' : value.toFixed(2);

  return `
    <article class="transcript-page">
      <div class="watermark" aria-hidden="true">OFFICIAL ACADEMIC RECORD</div>
      <header class="masthead">
        <img class="brand-mark" src="${logoImage}" alt="Emit Academy">
        <div class="brand-copy"><p>EMIT ACADEMY</p><span>Learn. Grow. Lead. · Office of the Registrar</span></div>
        <div class="document-title"><span>ACADEMIC TRANSCRIPT</span><strong>FRONT</strong></div>
      </header>
      <div class="record-line"><span>Transcript serial <strong>${escapeHtml(serialNumber)}</strong></span><span>Issue date <strong>${escapeHtml(issueDate)}</strong></span></div>
      <section class="student-details">
        <div class="student-name"><span>STUDENT NAME</span><strong>${escapeHtml(student.name)}</strong></div>
        <div><span>STUDENT ID</span><strong>${escapeHtml(student.student_id)}</strong></div>
        <div><span>COHORT</span><strong>${escapeHtml(student.class || '—')}</strong></div>
      </section>
      <div class="section-heading"><span>COURSES TAKEN &amp; ACADEMIC RESULTS</span><span>Published course totals</span></div>
      <table class="transcript-table grades-table">
        <thead><tr><th>COURSE CODE</th><th>COURSE NAME</th><th>LEVEL</th><th>RESULT</th><th>GRADE</th><th>POINTS</th></tr></thead>
        <tbody>${courseRows || '<tr><td colspan="6" class="empty">No course results are recorded.</td></tr>'}</tbody>
      </table>
      <section class="gpa-summary">
        <div><span>LEVEL 1 GPA</span><strong>${gpaValue(levelOneGpa)}</strong></div>
        <div><span>LEVEL 2 GPA</span><strong>${gpaValue(levelTwoGpa)}</strong></div>
        <div class="cumulative"><span>CUMULATIVE GPA · 4.0 SCALE</span><strong>${gpaValue(cumulativeGpa)}</strong></div>
      </section>
      <footer class="document-footer">
        <div class="verify-copy"><strong>VERIFY THIS TRANSCRIPT</strong><span>Scan the QR code to confirm the serial against the live school record. Publication revocation invalidates this copy.</span><code>${escapeHtml(serialNumber)}</code></div>
        <img class="verify-qr" src="${qrImage}" alt="Transcript verification QR code">
        <div class="footer-brand">EMIT ACADEMY<br><span>Official record · Page 1 of 2</span></div>
      </footer>
    </article>
    <article class="transcript-page">
      <div class="watermark" aria-hidden="true">OFFICIAL ACADEMIC RECORD</div>
      <header class="masthead">
        <img class="brand-mark" src="${logoImage}" alt="Emit Academy">
        <div class="brand-copy"><p>EMIT ACADEMY</p><span>Learn. Grow. Lead. · Office of the Registrar</span></div>
        <div class="document-title"><span>COURSE ATTENDANCE</span><strong>BACK</strong></div>
      </header>
      <div class="record-line"><span>Student <strong>${escapeHtml(student.name)}</strong> · ${escapeHtml(student.student_id)}</span><span>Serial <strong>${escapeHtml(serialNumber)}</strong></span></div>
      <div class="section-heading"><span>SESSION ATTENDANCE &amp; COURSE HOURS</span><span>By enrolled course</span></div>
      <table class="transcript-table attendance-table">
        <thead><tr><th>COURSE CODE</th><th>COURSE NAME</th><th>SESSIONS HELD</th><th>SESSIONS ATTENDED</th><th>COURSE HOURS</th></tr></thead>
        <tbody>${attendanceRows || '<tr><td colspan="5" class="empty">No course attendance records are available.</td></tr>'}</tbody>
      </table>
      <div class="attendance-note"><strong>Attendance record</strong><span>Sessions held and attended are based on recorded class attendance through the issue date. Course hours reflect the approved course workload total.</span></div>
      <div class="signature-row"><div>Registrar / Authorized Officer</div><div>Academic Dean</div></div>
      <footer class="back-footer">
        <div><strong>TRANSCRIPT SERIAL</strong><span>${escapeHtml(serialNumber)}</span></div>
        <div><strong>AUTHENTICITY</strong><span>Verify this document by scanning the QR code on the front page.</span></div>
        <div class="footer-brand">EMIT ACADEMY<br><span>Official record · Page 2 of 2</span></div>
      </footer>
    </article>
    <style>
      *{box-sizing:border-box}
      .transcript-page{position:relative;display:flex;flex-direction:column;isolation:isolate;width:794px;min-height:1122px;padding:30px 34px 24px;overflow:hidden;border:1px solid #d5deea;background:#fff;color:#152b3c;font-family:Arial,Helvetica,sans-serif;break-after:page;page-break-after:always}
      .transcript-page>*:not(.watermark){position:relative;z-index:1}
      .watermark{position:absolute;z-index:0;top:44%;left:50%;width:100%;transform:translate(-50%,-50%) rotate(-24deg);text-align:center;white-space:nowrap;color:rgba(30,58,138,.055);font-size:58px;font-weight:900;letter-spacing:7px}
      .masthead{display:flex;align-items:center;gap:14px;padding-bottom:16px;border-bottom:4px solid #1e3a8a}
      .brand-mark{display:block;width:50px;height:50px;border-radius:12px;object-fit:contain}
      .brand-copy{flex:1}.brand-copy p{margin:0;color:#1e3a8a;font-size:16px;font-weight:900;letter-spacing:2px}.brand-copy span{display:block;margin-top:5px;color:#64748b;font-size:10px;letter-spacing:.7px}
      .document-title{text-align:right}.document-title span{display:block;color:#a86f1d;font-size:12px;font-weight:900;letter-spacing:1.6px}.document-title strong{display:inline-block;margin-top:6px;padding:4px 10px;border-radius:4px;background:#fef3c7;color:#854d0e;font-size:9px;letter-spacing:1px}
      .record-line{display:flex;justify-content:space-between;gap:16px;margin:12px 0;color:#64748b;font-size:10px}.record-line strong{color:#172a3a}
      .student-details{display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;margin:4px 0 16px;padding:13px 15px;border:1px solid #dce4ee;border-left:4px solid #c8102e;border-radius:5px;background:#f8fafc}
      .student-details span{display:block;color:#64748b;font-size:8px;font-weight:800;letter-spacing:1px}.student-details strong{display:block;margin-top:5px;color:#152b3c;font-size:12px}
      .section-heading{display:flex;justify-content:space-between;align-items:center;margin:0 0 7px;color:#1e3a8a;font-size:10px;font-weight:900;letter-spacing:1px}.section-heading span+span{color:#64748b;font-size:9px;font-weight:600;letter-spacing:0}
      .transcript-table{width:100%;border-collapse:collapse;font-size:10px}
      .transcript-table th{padding:9px 10px;background:#1e3a8a;color:#fff;text-align:left;font-size:8px;font-weight:800;letter-spacing:.7px}
      .transcript-table td{padding:7px 10px;border:1px solid #dbe3ec;color:#334155;vertical-align:middle}
      .transcript-table tbody tr:nth-child(even){background:#f8fafc}.transcript-table .code{font-family:Consolas,monospace;font-weight:700;color:#1e3a8a;white-space:nowrap}.transcript-table .grade{font-weight:800;text-align:center}.transcript-table .numeric{text-align:center;font-variant-numeric:tabular-nums}.transcript-table .empty{text-align:center;color:#64748b}
      .gpa-summary{display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:10px;margin-top:14px}
      .gpa-summary div{padding:10px 12px;border:1px solid #dbe3ec;border-radius:5px;text-align:center;background:#f8fafc}.gpa-summary .cumulative{border-color:#1e3a8a;background:#eff6ff}
      .gpa-summary span{display:block;color:#64748b;font-size:8px;font-weight:800;letter-spacing:.7px}.gpa-summary strong{display:block;margin-top:4px;color:#1e3a8a;font-size:19px}
      .document-footer{display:flex;align-items:center;gap:14px;margin-top:auto;padding-top:12px;border-top:1px solid #dbe3ec}
      .verify-copy{flex:1}.verify-copy strong,.back-footer strong{display:block;color:#1e3a8a;font-size:8px;font-weight:900;letter-spacing:.8px}.verify-copy span{display:block;max-width:570px;margin:4px 0;color:#64748b;font-size:8px;line-height:1.4}.verify-copy code{color:#334155;font-size:8px}
      .verify-qr{width:70px;height:70px;object-fit:contain}.footer-brand{text-align:right;color:#1e3a8a;font-size:8px;font-weight:900;letter-spacing:.7px;line-height:1.5}.footer-brand span{color:#64748b;font-size:7px;font-weight:500;letter-spacing:0}
      .attendance-table th:nth-child(n+3){text-align:center}.attendance-table td:nth-child(3),.attendance-table td:nth-child(4),.attendance-table td:nth-child(5){text-align:center;font-variant-numeric:tabular-nums}
      .attendance-note{display:flex;gap:12px;margin-top:18px;padding:12px 14px;border:1px solid #dbe3ec;border-radius:5px;background:#f8fafc;font-size:9px}.attendance-note strong{flex:none;color:#1e3a8a}.attendance-note span{color:#64748b;line-height:1.5}
      .signature-row{display:grid;grid-template-columns:1fr 1fr;gap:70px;margin:90px 30px 28px}.signature-row div{padding-top:8px;border-top:1px solid #334155;color:#475569;font-size:9px}
      .back-footer{display:grid;grid-template-columns:1fr 1.4fr auto;gap:18px;align-items:end;margin-top:auto;padding-top:12px;border-top:1px solid #dbe3ec}.back-footer>div span{display:block;margin-top:4px;color:#64748b;font-size:8px}
    </style>`;
}

export async function createAcademicTranscriptPdf(
  student: TranscriptStudent,
  grades: StudentGrade[],
  serialNumber: string,
): Promise<Blob> {
  if (!/^RBS-TR-\d{8}-[A-F0-9]{16}$/i.test(serialNumber)) {
    throw new Error('A valid transcript serial number is required.');
  }
  const sourceId = `academic-transcript-${crypto.randomUUID()}`;
  let source: HTMLDivElement | null = null;
  try {
    const verificationUrl = new URL('/verify-transcript', window.location.origin);
    verificationUrl.searchParams.set('serial', serialNumber);
    const [qrImage, logoImage] = await Promise.all([
      qrDataUrl(verificationUrl.toString()),
      logoDataUrl(),
    ]);
    source = document.createElement('div');
    source.id = sourceId;
    source.style.cssText = 'position:fixed;left:-12000px;top:0;width:794px;min-height:2244px;background:#fff;';
    source.innerHTML = transcriptHtml(student, grades, serialNumber, qrImage, logoImage);
    document.body.appendChild(source);
    await document.fonts?.ready;
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    if (source.scrollHeight < 2000 || source.scrollWidth < 700) {
      throw new Error('The transcript layout could not be prepared for rendering.');
    }
    const { default: html2pdf } = await import('html2pdf.js');
    const blob = await html2pdf().set({
      filename: `Emit-Academy-Transcript-${student.student_id}-${serialNumber}.pdf`,
      margin: 0,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDocument: Document) => {
          const clonedSource = clonedDocument.getElementById(sourceId);
          if (!clonedSource) throw new Error('The transcript could not be prepared for PDF rendering.');
          clonedSource.style.position = 'static';
          clonedSource.style.left = 'auto';
          clonedSource.style.top = 'auto';
          clonedSource.style.width = '794px';
        },
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(source).outputPdf('blob');
    if (!(blob instanceof Blob) || blob.type !== 'application/pdf' || blob.size < 100) {
      throw new Error('The transcript PDF generator returned an invalid or empty document.');
    }
    return blob;
  } finally {
    source?.remove();
  }
}
