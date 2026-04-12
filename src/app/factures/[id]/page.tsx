'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Invoice } from '@/lib/types';
import { getInvoice, updateInvoiceStatus } from '@/lib/store';
import { COMPANY_INFO, STATUS_LABELS, STATUS_COLORS } from '@/lib/constants';
import { lineTotal, totalHT, vatBreakdown, totalVAT, totalTTC, formatCurrency, formatDate } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import PDFDownloadButton from '@/components/pdf-download-button';

function clientDisplayName(invoice: Invoice): string {
  if (invoice.client.type === 'entreprise') return invoice.client.companyName || '';
  return `${invoice.client.firstName || ''} ${invoice.client.lastName || ''}`.trim();
}

export default function ViewInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const inv = getInvoice(id);
    if (!inv) {
      router.push('/');
      return;
    }
    setInvoice(inv);
  }, [id, router]);

  if (!mounted || !invoice) return null;

  const ht = totalHT(invoice.lines);
  const vatItems = vatBreakdown(invoice.lines);
  const vat = totalVAT(invoice.lines);
  const ttc = totalTTC(invoice.lines);

  function handleMarkEncaisse() {
    updateInvoiceStatus(invoice!.id, 'encaisse');
    setInvoice(getInvoice(invoice!.id) || null);
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.push('/')}>
            Retour
          </Button>
          <Badge className={`${STATUS_COLORS[invoice.status]} border-0`}>
            {STATUS_LABELS[invoice.status]}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Link href={`/factures/${invoice.id}/modifier`}>
            <Button variant="outline">Modifier</Button>
          </Link>
          {invoice.status !== 'encaisse' && (
            <Button variant="outline" onClick={handleMarkEncaisse} className="text-green-600 border-green-300 hover:bg-green-50">
              Marquer comme encaissée
            </Button>
          )}
          <PDFDownloadButton invoice={invoice} />
        </div>
      </div>

      {/* Invoice preview */}
      <Card className="p-8 bg-white">
        {/* Header */}
        <div className="flex justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#E8651A' }}>{COMPANY_INFO.name}</h2>
            <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">
              {COMPANY_INFO.address}{'\n'}
              {COMPANY_INFO.postalCode} {COMPANY_INFO.city}, {COMPANY_INFO.country}{'\n'}
              SIRET : {COMPANY_INFO.siret}{'\n'}
              N° TVA Intracom. : .{'\n'}
              {COMPANY_INFO.email}{'\n'}
              {COMPANY_INFO.phone}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase" style={{ color: '#E8651A' }}>Facturé à</p>
            <p className="font-bold mt-1">{clientDisplayName(invoice)}</p>
            {invoice.client.type === 'entreprise' && invoice.client.siret && (
              <p className="text-sm text-gray-500">SIRET : {invoice.client.siret}</p>
            )}
            <p className="text-sm text-gray-500">
              {invoice.client.address}<br />
              {invoice.client.postalCode} {invoice.client.city}<br />
              {invoice.client.country}
            </p>
          </div>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Facture {invoice.number}</h1>
          <div className="flex justify-between mt-1">
            <span className="text-gray-500">{invoice.title}</span>
            <span className="text-gray-500">Émise le {formatDate(invoice.issueDate)}</span>
          </div>
        </div>

        {/* Table */}
        <div className="mb-6">
          <div className="grid grid-cols-12 gap-2 p-3 rounded-md text-sm font-semibold" style={{ backgroundColor: '#FFF0E6' }}>
            <div className="col-span-5">Libellé</div>
            <div className="col-span-1 text-center">Qté</div>
            <div className="col-span-2 text-right">Prix unit. HT</div>
            <div className="col-span-2 text-center">TVA</div>
            <div className="col-span-2 text-right">Total HT</div>
          </div>
          {invoice.lines.map((line) => (
            <div key={line.id} className="grid grid-cols-12 gap-2 p-3 border-b border-gray-100 text-sm">
              <div className="col-span-5">
                {line.label}
                {line.description && <div className="text-xs text-gray-400">{line.description}</div>}
              </div>
              <div className="col-span-1 text-center">{line.quantity}</div>
              <div className="col-span-2 text-right">{formatCurrency(line.unitPrice)}</div>
              <div className="col-span-2 text-center">{line.vatRate}%</div>
              <div className="col-span-2 text-right">{formatCurrency(lineTotal(line))}</div>
            </div>
          ))}
        </div>

        {/* Due date + Totals */}
        <div className="flex justify-between mb-8">
          <div className="p-4 rounded-md border" style={{ backgroundColor: '#FFF0E6', borderColor: '#FFCBA4' }}>
            <p className="text-xs font-semibold uppercase" style={{ color: '#E8651A' }}>Échéance de paiement</p>
            <p className="font-bold mt-1">{formatDate(invoice.dueDate)}</p>
          </div>
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total HT</span>
              <span>{formatCurrency(ht)}</span>
            </div>
            {vatItems.map((v) => (
              <div key={v.rate} className="flex justify-between text-sm">
                <span className="text-gray-500">TVA {v.rate}%</span>
                <span>{formatCurrency(v.amount)}</span>
              </div>
            ))}
            {vatItems.length === 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">TVA</span>
                <span>{formatCurrency(0)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total TTC</span>
              <span>{formatCurrency(ttc)}</span>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase mb-2" style={{ color: '#E8651A' }}>Termes et conditions</p>
          <p className="text-xs text-gray-500 whitespace-pre-line">{invoice.terms}</p>
        </div>

        <Separator />

        {/* Footer */}
        <div className="flex justify-between mt-4">
          <div>
            <p className="text-xs font-semibold" style={{ color: '#E8651A' }}>{COMPANY_INFO.name}</p>
            <p className="text-xs text-gray-500">
              SIRET : {COMPANY_INFO.siret}<br />
              {COMPANY_INFO.vatMention}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold" style={{ color: '#E8651A' }}>Mode de paiement</p>
            <p className="text-xs text-gray-500">
              Virement bancaire<br />
              IBAN : {COMPANY_INFO.iban}<br />
              BIC : {COMPANY_INFO.bic}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
