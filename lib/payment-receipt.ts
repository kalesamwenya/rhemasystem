export type PaymentReceiptData = {
  student_name: string;
  student_id: string;
  cohort: string;
  paid_for: string;
  term: string;
  amount: number;
  currency: string;
  reference: string;
  gateway: string;
  gateway_transaction_id: string | null;
  created_at: string;
  receipt_token: string;
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

export async function createPaymentReceiptPdf(payment: PaymentReceiptData): Promise<Blob> {
  if (!/^[a-f0-9]{64}$/i.test(payment.receipt_token)) {
    throw new Error('This confirmed payment does not have a valid receipt verification token.');
  }

  const [{ default: html2pdf }, { BrowserQRCodeSvgWriter }] = await Promise.all([
    import('html2pdf.js'),
    import('@zxing/browser'),
  ]);
  const verificationUrl = new URL('/verify-payment', window.location.origin);
  verificationUrl.searchParams.set('token', payment.receipt_token);
  const qrSvg = new BrowserQRCodeSvgWriter().write(verificationUrl.toString(), 192, 192);
  const svgUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(qrSvg)], { type: 'image/svg+xml;charset=utf-8' }));
  const qrImage = new Image();
  try {
    qrImage.src = svgUrl;
    await qrImage.decode();
  } finally {
    URL.revokeObjectURL(svgUrl);
  }

  const qrCanvas = document.createElement('canvas');
  qrCanvas.width = 384;
  qrCanvas.height = 384;
  const context = qrCanvas.getContext('2d');
  if (!context) throw new Error('Unable to prepare the receipt verification QR code.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
  context.drawImage(qrImage, 0, 0, qrCanvas.width, qrCanvas.height);

  const receipt = document.createElement('div');
  const studentName = escapeHtml(payment.student_name);
  const studentId = escapeHtml(payment.student_id);
  const cohort = escapeHtml(payment.cohort);
  const description = escapeHtml(payment.paid_for);
  const term = escapeHtml(payment.term);
  const reference = escapeHtml(payment.reference);
  const gateway = escapeHtml(payment.gateway || 'Rhema Bible School');
  const gatewayTransaction = escapeHtml(payment.gateway_transaction_id || 'Not supplied');
  const transactionDate = escapeHtml(new Date(payment.created_at).toLocaleString());
  const amountPaid = escapeHtml(money(payment.amount, payment.currency));
  const qrImageData = qrCanvas.toDataURL('image/png');
  receipt.style.cssText = 'position:fixed;left:0;top:0;z-index:-1;width:760px;background:#fff;color:#0f172a;font-family:Arial,sans-serif;';
  receipt.innerHTML = `
    <div style="position:relative;overflow:hidden;padding:52px 54px 44px;border:1px solid #dbe3ef;">
      <div style="position:absolute;top:38%;left:8%;z-index:0;color:rgba(30,58,138,.055);font-size:116px;font-weight:900;letter-spacing:12px;transform:rotate(-28deg);">PAID</div>
      <div style="position:relative;z-index:1;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:4px solid #1e3a8a;padding-bottom:22px;">
          <div><div style="font-size:13px;font-weight:800;letter-spacing:3px;color:#b7791f;text-transform:uppercase;">Rhema Bible School</div><div style="margin-top:8px;font-size:27px;font-weight:800;color:#0f172a;">Official payment receipt</div><div style="margin-top:6px;color:#64748b;font-size:12px;">Student finance · verified payment</div></div>
          <div style="padding:9px 14px;border-radius:20px;background:#dcfce7;color:#166534;font-size:11px;font-weight:800;letter-spacing:1px;">PAID &amp; VERIFIED</div>
        </div>
        <div style="display:flex;justify-content:space-between;gap:26px;padding:25px 0 20px;">
          <div style="flex:1;"><div style="margin-bottom:15px;font-size:10px;font-weight:800;letter-spacing:1.5px;color:#64748b;text-transform:uppercase;">Received from</div><div style="font-size:17px;font-weight:800;">${studentName}</div><div style="margin-top:6px;color:#475569;font-size:12px;">Student ID: ${studentId}</div><div style="margin-top:4px;color:#475569;font-size:12px;">Cohort: ${cohort}</div></div>
          <div style="width:230px;"><div style="margin-bottom:15px;font-size:10px;font-weight:800;letter-spacing:1.5px;color:#64748b;text-transform:uppercase;">Receipt details</div><div style="font-size:12px;color:#475569;">Receipt reference</div><div style="margin:4px 0 10px;font-family:monospace;font-size:11px;font-weight:700;">${reference}</div><div style="font-size:12px;color:#475569;">Date received</div><div style="margin-top:4px;font-size:12px;font-weight:700;">${transactionDate}</div></div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-top:10px;">
          <thead><tr style="background:#f1f5f9;color:#475569;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;"><th style="padding:13px;">Paid for</th><th style="padding:13px;">Fee period</th><th style="padding:13px;text-align:right;">Amount</th></tr></thead>
          <tbody><tr><td style="padding:18px 13px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;">${description}</td><td style="padding:18px 13px;border-bottom:1px solid #e2e8f0;font-size:12px;">${term}</td><td style="padding:18px 13px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:14px;font-weight:800;">${amountPaid}</td></tr></tbody>
        </table>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:22px;padding:18px 20px;background:#f8fafc;border-radius:10px;"><div style="font-size:11px;font-weight:700;color:#475569;">TOTAL RECEIVED</div><div style="font-size:23px;font-weight:900;color:#1e3a8a;">${amountPaid}</div></div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:20px;margin-top:28px;padding-top:22px;border-top:1px solid #e2e8f0;">
          <div style="flex:1;"><div style="font-size:11px;font-weight:800;">Payment method: ${gateway}</div><div style="margin-top:7px;font-size:10px;color:#64748b;">Provider transaction: ${gatewayTransaction}</div><div style="margin-top:18px;font-size:10px;line-height:1.6;color:#64748b;">Scan the QR code to independently verify this receipt online. This receipt confirms funds received for the item listed above.</div></div>
          <div style="width:142px;text-align:center;"><img src="${qrImageData}" alt="Payment verification QR code" style="width:126px;height:126px;"><div style="margin-top:5px;font-size:9px;font-weight:700;color:#475569;">SCAN TO VERIFY</div></div>
        </div>
        <div style="margin-top:28px;padding-top:13px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:9px;">Rhema Bible School · This is a computer-generated receipt.</div>
      </div>
    </div>`;

  document.body.appendChild(receipt);
  try {
    const safeReference = payment.reference.replace(/[^a-z0-9_-]/gi, '-');
    const pdf = await html2pdf().set({
      filename: `Rhema-Receipt-${safeReference}.pdf`,
      margin: 8,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).from(receipt).outputPdf('blob');
    if (!(pdf instanceof Blob)) throw new Error('The receipt PDF generator returned an invalid document.');
    return pdf;
  } finally {
    receipt.remove();
  }
}

export async function viewPaymentReceipt(payment: PaymentReceiptData): Promise<void> {
  const preview = window.open('about:blank', '_blank');
  if (!preview) throw new Error('Allow pop-ups to open the receipt preview.');
  try {
    const pdf = await createPaymentReceiptPdf(payment);
    const url = URL.createObjectURL(pdf);
    preview.location.replace(url);
    window.setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
  } catch (error) {
    preview.close();
    throw error;
  }
}

export async function downloadPaymentReceipt(payment: PaymentReceiptData): Promise<void> {
  const pdf = await createPaymentReceiptPdf(payment);
  const url = URL.createObjectURL(pdf);
  const link = document.createElement('a');
  const safeReference = payment.reference.replace(/[^a-z0-9_-]/gi, '-');
  link.href = url;
  link.download = `Rhema-Receipt-${safeReference}.pdf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
