import { createBrandedPdfBlob } from '@/lib/branded-pdf';

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
  verification_url: string;
};

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-ZM', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);

export function createActivityRequestInvoicePdf(invoice: ActivityRequestInvoiceData): Promise<Blob> {
  return createBrandedPdfBlob({
    title: 'Activity access invoice',
    subtitle: `${invoice.activity_type} access · payment due`,
    fileName: `${invoice.invoice_number}.pdf`,
    student: {
      name: invoice.student_name,
      id: invoice.student_id,
      cohort: invoice.cohort,
    },
    sections: [
      {
        title: 'Invoice details',
        fields: [
          { label: 'Invoice number', value: invoice.invoice_number },
          { label: 'Date issued', value: new Date(`${invoice.invoice_date}T00:00:00`).toLocaleDateString() },
          { label: 'Payment reference', value: invoice.reference },
          { label: 'Amount due', value: money(invoice.amount, invoice.currency) },
        ],
      },
      {
        title: 'Activity',
        fields: [
          { label: 'Activity name', value: invoice.activity_name },
          { label: 'Activity type', value: invoice.activity_type },
          { label: 'Charge description', value: invoice.description },
          { label: 'Billing portal', value: invoice.portal_url },
        ],
      },
    ],
    verifications: [{
      label: 'Verify this invoice',
      url: invoice.verification_url,
      note: 'Scan to confirm this activity charge was issued by Emit Academy.',
    }],
  });
}
