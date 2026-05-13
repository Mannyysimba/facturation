'use client';

import { use } from 'react';
import InvoiceForm from '@/components/invoice-form';

export default function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <InvoiceForm invoiceId={id} kind="devis" />;
}
