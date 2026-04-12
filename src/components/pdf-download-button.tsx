'use client';

import { useState, useEffect } from 'react';
import { Invoice } from '@/lib/types';
import { Button } from '@/components/ui/button';

export default function PDFDownloadButton({ invoice }: { invoice: Invoice }) {
  const [ready, setReady] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  async function handleDownload() {
    setGenerating(true);
    try {
      const [{ pdf }, { default: InvoicePDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/invoice-pdf'),
      ]);
      const blob = await pdf(<InvoicePDF invoice={invoice} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Facture-${invoice.number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }

  if (!ready) return null;

  return (
    <Button
      className="bg-orange-500 hover:bg-orange-600"
      onClick={handleDownload}
      disabled={generating}
    >
      {generating ? 'Génération...' : 'Télécharger PDF'}
    </Button>
  );
}
