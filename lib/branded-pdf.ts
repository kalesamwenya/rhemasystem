export type BrandedPdfField = { label: string; value: string };
export type BrandedPdfSection = {
  title: string;
  fields?: BrandedPdfField[];
  columns?: string[];
  rows?: string[][];
};
export type BrandedPdfVerification = { label: string; url: string; note?: string };
export type BrandedPdfDocument = {
  title: string;
  subtitle: string;
  fileName: string;
  student?: { name: string; id: string; cohort?: string };
  sections: BrandedPdfSection[];
  verifications?: BrandedPdfVerification[];
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
  if (!context) throw new Error('Unable to prepare the document verification QR code.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

function renderSection(section: BrandedPdfSection): string {
  const fields = section.fields?.length
    ? `<dl class="fields">${section.fields.map((field) => `<div class="field"><dt>${escapeHtml(field.label)}</dt><dd>${escapeHtml(field.value || 'Not provided')}</dd></div>`).join('')}</dl>`
    : '';
  const table = section.columns?.length
    ? `<table><thead><tr>${section.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody>${(section.rows || []).map((row) => `<tr>${section.columns?.map((_, index) => `<td>${escapeHtml(row[index] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : '';
  return `<section><h2>${escapeHtml(section.title)}</h2>${fields}${table}</section>`;
}

async function createPdfBlob(data: BrandedPdfDocument): Promise<Blob> {
  const [{ default: html2pdf }, verificationCodes] = await Promise.all([
    import('html2pdf.js'),
    Promise.all((data.verifications || []).map(async (verification) => ({
      ...verification,
      image: await qrDataUrl(verification.url),
    }))),
  ]);
  const student = data.student
    ? `<div class="student"><strong>${escapeHtml(data.student.name)}</strong><span>Student ID: ${escapeHtml(data.student.id)}</span>${data.student.cohort ? `<span>Cohort: ${escapeHtml(data.student.cohort)}</span>` : ''}</div>`
    : '';
  const verification = verificationCodes.length
    ? `<div class="verification">${verificationCodes.map((item) => `<div class="qr"><img src="${item.image}" alt=""><strong>${escapeHtml(item.label)}</strong>${item.note ? `<span>${escapeHtml(item.note)}</span>` : ''}</div>`).join('')}</div>`
    : '';
  const generatedDate = new Date().toLocaleString();
  const element = document.createElement('div');
  element.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:#fff;color:#0f172a;font-family:Arial,sans-serif;';
  element.innerHTML = `
    <article class="document">
      <header><div class="brand"><div class="mark">R</div><div><p>RHEMA BIBLE SCHOOL</p><span>Student and Academic Services</span></div></div><div class="doc-type">OFFICIAL DOCUMENT</div></header>
      <div class="title"><div><h1>${escapeHtml(data.title)}</h1><p>${escapeHtml(data.subtitle)}</p></div><span>ISSUED ${escapeHtml(generatedDate)}</span></div>
      ${student}
      ${(data.sections || []).map(renderSection).join('')}
      ${verification}
      <footer>Rhema Bible School · Official school record · This document was generated electronically.</footer>
    </article>
    <style>
      *{box-sizing:border-box}.document{position:relative;padding:42px 48px 34px;border:1px solid #dbe3ef;min-height:1040px}
      header{display:flex;align-items:center;justify-content:space-between;border-bottom:4px solid #1e3a8a;padding-bottom:18px}
      .brand{display:flex;align-items:center;gap:12px}.mark{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:#1e3a8a;color:#fbbf24;font-size:23px;font-weight:900}
      .brand p{margin:0;color:#1e3a8a;font-size:13px;font-weight:900;letter-spacing:2px}.brand span{display:block;margin-top:5px;color:#64748b;font-size:10px}
      .doc-type{color:#b7791f;font-size:9px;font-weight:800;letter-spacing:1.5px}
      .title{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;margin:26px 0 20px}.title h1{margin:0;color:#0f172a;font-size:25px}.title p{margin:7px 0 0;color:#64748b;font-size:11px}.title>span{flex:none;color:#94a3b8;font-size:8px;font-weight:700}
      .student{display:flex;gap:18px;align-items:center;padding:13px 15px;margin-bottom:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;font-size:10px;color:#475569}.student strong{color:#0f172a;font-size:12px}
      section{margin:19px 0 0;page-break-inside:avoid}section h2{margin:0 0 9px;padding-bottom:7px;border-bottom:1px solid #e2e8f0;color:#1e3a8a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px}
      .fields{display:grid;grid-template-columns:1fr 1fr;gap:11px 20px;margin:0}.field dt{color:#64748b;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.8px}.field dd{margin:4px 0 0;color:#0f172a;font-size:10px;font-weight:600;white-space:pre-wrap;overflow-wrap:anywhere}
      table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#1e3a8a;color:white;text-align:left;font-size:8px;text-transform:uppercase;letter-spacing:.5px}th,td{padding:8px 9px;border:1px solid #e2e8f0;font-size:9px;vertical-align:top}td{color:#334155}
      .verification{display:flex;gap:18px;justify-content:flex-end;margin-top:24px;padding-top:15px;border-top:1px solid #e2e8f0}.qr{display:flex;flex-direction:column;align-items:center;width:124px;text-align:center}.qr img{width:88px;height:88px}.qr strong{margin-top:5px;color:#1e3a8a;font-size:8px;text-transform:uppercase;letter-spacing:.5px}.qr span{margin-top:3px;color:#64748b;font-size:7px}
      footer{position:absolute;bottom:20px;left:48px;right:48px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:8px}
    </style>`;
  document.body.appendChild(element);
  try {
    const pdf = await html2pdf().set({
      margin: 8,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(element).outputPdf('blob');
    if (!(pdf instanceof Blob)) throw new Error('The PDF generator returned an invalid document.');
    return pdf;
  } finally {
    element.remove();
  }
}

export async function exportBrandedPdf(
  buildDocument: () => BrandedPdfDocument | Promise<BrandedPdfDocument>,
  mode: 'view' | 'download',
): Promise<void> {
  const preview = mode === 'view' ? window.open('about:blank', '_blank') : null;
  if (mode === 'view' && !preview) throw new Error('Allow pop-ups to open the PDF preview.');

  try {
    const data = await buildDocument();
    const blob = await createPdfBlob(data);
    if (preview) {
      const url = URL.createObjectURL(blob);
      preview.location.replace(url);
      window.setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = data.fileName.endsWith('.pdf') ? data.fileName : `${data.fileName}.pdf`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    preview?.close();
    throw error;
  }
}
