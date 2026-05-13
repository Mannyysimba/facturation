'use client';

import { use } from 'react';
import InvoiceView from '@/components/invoice-view';

export default function ViewQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <InvoiceView id={id} />;
}
