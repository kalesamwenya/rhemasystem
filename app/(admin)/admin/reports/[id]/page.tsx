'use client';

import { useParams } from 'next/navigation';
import SharedReportPage from '@/components/admin/SharedReportPage';

export default function SharedReportDetailPage() {
  const params = useParams<{ id: string }>();
  const reportId = Number(params.id);
  return <SharedReportPage reportId={reportId} />;
}
