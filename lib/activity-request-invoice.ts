export type ActivityRequestInvoiceData = {
  invoice_number: string;
  invoice_date: string;
  student_name: string;
  student_id: string;
  cohort: string;
  activity_name: string;
  activity_type: 'quiz' | 'exam' | 'assignment' | 'audio';
  description: string;
  amount: number;
  currency: string;
  reference: string;
  portal_url: string;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character);

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-ZM', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);

export async function createActivityRequestInvoicePdf(invoice: ActivityRequestInvoiceData): Promise<Blob> {
  const { default: html2pdf } = await import('html2pdf.js');
  const invoiceNumber = escapeHtml(invoice.invoice_number);
  const invoiceDate = escapeHtml(new Date(`${invoice.invoice_date}T00:00:00`).toLocaleDateString());
  const studentName = escapeHtml(invoice.student_name);
  const studentId = escapeHtml(invoice.student_id);
  const cohort = escapeHtml(invoice.cohort);
  const activity = escapeHtml(`${invoice.activity_type}: ${invoice.activity_name}`);
  const description = escapeHtml(invoice.description);
  const reference = escapeHtml(invoice.reference);
  const amount = escapeHtml(money(invoice.amount, invoice.currency));
  const portalUrl = escapeHtml(invoice.portal_url);
  const page = document.createElement('div');
  page.style.cssText = 'position:fixed;left:-10000px;top:0;width:760px;background:#fff;color:#0f172a;font-family:Arial,sans-serif;';
  page.innerHTML = `
    <article style="position:relative;min-height:940px;overflow:hidden;padding:52px 54px 44px;border:1px solid #dbe3ef">
      <div style="position:absolute;top:38%;left:10%;z-index:0;color:rgba(30,58,138,.045);font-size:112px;font-weight:900;letter-spacing:12px;transform:rotate(-28deg)">INVOICE</div>
      <div style="position:relative;z-index:1">
        <header style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:4px solid #1e3a8a;padding-bottom:22px">
          <div><p style="margin:0;color:#b7791f;font-size:13px;font-weight:900;letter-spacing:2px">RHEMA BIBLE SCHOOL</p><h1 style="margin:10px 0 0;font-size:28px;color:#0f172a">Activity access invoice</h1><p style="margin:7px 0 0;color:#64748b;font-size:12px">Student finance · payment due</p></div>
          <span style="padding:9px 14px;border-radius:20px;background:#fff7ed;color:#9a5b0a;font-size:10px;font-weight:900;letter-spacing:1px">INVOICE</span>
        </header>
        <section style="display:flex;justify-content:space-between;gap:28px;padding:28px 0 24px">
          <div style="flex:1"><p style="margin:0 0 10px;color:#64748b;font-size:10px;font-weight:800;letter-spacing:1.4px">BILLED TO</p><strong style="font-size:17px">${studentName}</strong><p style="margin:6px 0;color:#475569;font-size:12px">Student ID: ${studentId}</p><p style="margin:4px 0;color:#475569;font-size:12px">Cohort: ${cohort}</p></div>
          <div style="width:240px"><p style="margin:0 0 10px;color:#64748b;font-size:10px;font-weight:800;letter-spacing:1.4px">INVOICE DETAILS</p><p style="margin:0;color:#64748b;font-size:11px">Invoice number</p><strong style="font-family:monospace;font-size:12px">${invoiceNumber}</strong><p style="margin:9px 0 0;color:#64748b;font-size:11px">Date issued</p><strong style="font-size:12px">${invoiceDate}</strong><p style="margin:9px 0 0;color:#64748b;font-size:11px">Payment reference</p><strong style="font-family:monospace;font-size:11px">${reference}</strong></div>
        </section>
        <table style="width:100%;border-collapse:collapse;margin-top:8px">
          <thead><tr style="background:#1e3a8a;color:#fff;text-align:left;font-size:10px;letter-spacing:.7px"><th style="padding:14px">DESCRIPTION</th><th style="padding:14px">ACTIVITY</th><th style="padding:14px;text-align:right">AMOUNT</th></tr></thead>
          <tbody><tr style="background:#f8fafc"><td style="padding:19px 14px;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:700">${description}</td><td style="padding:19px 14px;border-bottom:1px solid #e2e8f0;color:#475569;font-size:11px">${activity}</td><td style="padding:19px 14px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px;font-weight:800">${amount}</td></tr></tbody>
        </table>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:24px;padding:20px 22px;background:#f1f5f9;border-radius:10px"><strong style="font-size:11px;color:#475569">TOTAL DUE</strong><strong style="font-size:24px;color:#1e3a8a">${amount}</strong></div>
        <section style="margin-top:30px;padding:22px;border:1px solid #dbe3ef;border-radius:10px"><h2 style="margin:0;color:#10283a;font-size:14px">How to pay</h2><p style="margin:10px 0 0;color:#475569;font-size:12px;line-height:1.7">Sign in to the Rhema student portal and open Billing &amp; payments. Use the invoice reference above when contacting Finance about this charge.</p><p style="margin:12px 0 0;color:#1e3a8a;font-size:11px;word-break:break-all">${portalUrl}</p></section>
        <p style="margin:26px 0 0;color:#64748b;font-size:10px;line-height:1.6">Please contact the school Finance office if you have a question about this invoice.</p>
      </div>
      <footer style="position:absolute;bottom:22px;left:54px;right:54px;padding-top:13px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:9px">Rhema Bible School · This is a computer-generated invoice.</footer>
    </article>`;

  document.body.appendChild(page);
  try {
    const pdf = await html2pdf().set({
      filename: `${invoice.invoice_number}.pdf`,
      margin: 8,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(page).outputPdf('blob');
    if (!(pdf instanceof Blob)) throw new Error('The invoice PDF generator returned an invalid document.');
    return pdf;
  } finally {
    page.remove();
  }
}
