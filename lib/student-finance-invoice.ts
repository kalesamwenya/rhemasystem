import { createBrandedPdfBlob } from '@/lib/branded-pdf';

export type StudentChargeInvoiceData = {
  student_name: string;
  student_id: string;
  cohort: string;
  description: string;
  term: string;
  amount: number;
  currency: string;
  reference: string;
  created_at: string;
  verification_url: string;
};

export function createStudentChargeInvoicePdf(invoice: StudentChargeInvoiceData): Promise<Blob> {
  const amount = new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: invoice.currency,
    maximumFractionDigits: 2,
  }).format(invoice.amount);
  return createBrandedPdfBlob({
    title: 'Student finance invoice',
    subtitle: 'Payment due · Student account',
    fileName: `Emit-Academy-Invoice-${invoice.reference}.pdf`,
    student: {
      name: invoice.student_name,
      id: invoice.student_id,
      cohort: invoice.cohort,
    },
    sections: [
      {
        title: 'Invoice details',
        fields: [
          { label: 'Invoice number / reference', value: invoice.reference },
          { label: 'Date issued', value: new Date(invoice.created_at).toLocaleDateString() },
          { label: 'Fee period', value: invoice.term || '—' },
          { label: 'Amount due', value: amount },
        ],
      },
      {
        title: 'Charge',
        fields: [
          { label: 'Activity / description', value: invoice.description },
          { label: 'Total charge', value: amount },
        ],
      },
    ],
    verifications: [{
      label: 'Verify this invoice',
      url: invoice.verification_url,
      note: 'Scan to confirm this charge was issued by Emit Academy.',
    }],
  });
}
