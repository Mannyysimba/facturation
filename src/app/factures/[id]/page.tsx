'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Invoice } from '@/lib/types';
import { getInvoice, updateInvoiceStatus } from '@/lib/store';
import { COMPANY_INFO, STATUS_LABELS } from '@/lib/constants';
import { lineTotal, totalHT, vatBreakdown, totalTTC, formatCurrency, formatDate } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import PDFDownloadButton from '@/components/pdf-download-button';

function clientDisplayName(invoice: Invoice): string {
  if (invoice.client.type === 'entreprise') return invoice.client.companyName || '';
  return `${invoice.client.firstName || ''} ${invoice.client.lastName || ''}`.trim();
}

const STATUS_DOT: Record<string, string> = {
  brouillon: 'bg-zinc-400',
  en_attente: 'bg-amber-400',
  encaisse: 'bg-emerald-500',
  en_retard: 'bg-red-500',
};

export default function ViewInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    (async () => {
      const inv = await getInvoice(id);
      if (!inv) {
        router.push('/');
        return;
      }
      setInvoice(inv);
    })();
  }, [id, router]);

  if (!mounted || !invoice) return null;

  const ht = totalHT(invoice.lines);
  const vatItems = vatBreakdown(invoice.lines);
  const ttc = totalTTC(invoice.lines);

  async function handleMarkEncaisse() {
    await updateInvoiceStatus(invoice!.id, 'encaisse');
    const updated = await getInvoice(invoice!.id);
    setInvoice(updated || null);
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.push('/')} className="h-8 text-sm border-zinc-200">
              Retour
            </Button>
            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[invoice.status]}`} />
              {STATUS_LABELS[invoice.status]}
            </span>
          </div>
          <div className="flex gap-2">
            <Link href={`/factures/${invoice.id}/modifier`}>
              <Button variant="outline" className="h-8 text-sm border-zinc-200">Modifier</Button>
            </Link>
            {invoice.status !== 'encaisse' && (
              <Button
                variant="outline"
                onClick={handleMarkEncaisse}
                className="h-8 text-sm border-zinc-200"
              >
                Marquer encaiss&eacute;
              </Button>
            )}
            <PDFDownloadButton invoice={invoice} />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white border border-zinc-200 rounded-lg p-10 shadow-sm">
          {/* Header */}
          <div className="flex justify-between mb-10">
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">{COMPANY_INFO.name}</h2>
              <p className="text-sm text-slate-600 mt-1 whitespace-pre-line leading-relaxed">
                {COMPANY_INFO.address}{'\n'}
                {COMPANY_INFO.postalCode} {COMPANY_INFO.city}, {COMPANY_INFO.country}{'\n'}
                SIRET : {COMPANY_INFO.siret}{'\n'}
                {COMPANY_INFO.email}{'\n'}
                {COMPANY_INFO.phone}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-700">Factur&eacute; &agrave;</p>
              <p className="font-semibold text-slate-900 mt-1.5 text-base">{clientDisplayName(invoice)}</p>
              {invoice.client.type === 'entreprise' && invoice.client.siret && (
                <p className="text-sm text-slate-600 mt-0.5">SIRET : {invoice.client.siret}</p>
              )}
              <p className="text-sm text-slate-600 leading-relaxed mt-1">
                {invoice.client.address}<br />
                {invoice.client.postalCode} {invoice.client.city}<br />
                {invoice.client.country}
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="mb-8 pb-6 border-b-2 border-slate-900">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Facture {invoice.number}</h1>
            <div className="flex justify-between mt-2">
              <span className="text-sm font-medium text-slate-700">{invoice.title}</span>
              <span className="text-sm text-slate-600">&Eacute;mise le <span className="font-medium text-slate-800">{formatDate(invoice.issueDate)}</span></span>
            </div>
          </div>

          {/* Table */}
          <div className="mb-8">
            <div className="grid grid-cols-12 gap-2 py-3 px-3 bg-slate-50 rounded-t-md text-[11px] font-semibold text-slate-700 uppercase tracking-[0.06em]">
              <div className="col-span-5">Libell&eacute;</div>
              <div className="col-span-1 text-center">Qt&eacute;</div>
              <div className="col-span-2 text-right">Prix unit. HT</div>
              <div className="col-span-2 text-center">TVA</div>
              <div className="col-span-2 text-right">Total HT</div>
            </div>
            {invoice.lines.map((line) => (
              <div key={line.id} className="grid grid-cols-12 gap-2 py-3.5 px-3 border-b border-slate-100 text-sm">
                <div className="col-span-5">
                  <div className="text-slate-900 font-medium">{line.label}</div>
                  {line.description && <div className="text-xs text-slate-500 mt-0.5">{line.description}</div>}
                </div>
                <div className="col-span-1 text-center text-slate-800">{line.quantity}</div>
                <div className="col-span-2 text-right text-slate-800">{formatCurrency(line.unitPrice)}</div>
                <div className="col-span-2 text-center text-slate-600">{line.vatRate}%</div>
                <div className="col-span-2 text-right font-semibold text-slate-900">{formatCurrency(lineTotal(line))}</div>
              </div>
            ))}
          </div>

          {/* Due date + Totals */}
          <div className="flex justify-between mb-10 gap-6">
            <div className="rounded-lg px-5 py-4 h-fit bg-indigo-50 border border-indigo-100">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-700">&Eacute;ch&eacute;ance</p>
              <p className="font-bold text-slate-900 mt-1 text-base">{formatDate(invoice.dueDate)}</p>
            </div>
            <div className="w-72 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total HT</span>
                <span className="text-slate-900 font-medium">{formatCurrency(ht)}</span>
              </div>
              {vatItems.map((v) => (
                <div key={v.rate} className="flex justify-between text-sm">
                  <span className="text-slate-600">TVA {v.rate}%</span>
                  <span className="text-slate-900 font-medium">{formatCurrency(v.amount)}</span>
                </div>
              ))}
              {vatItems.length === 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">TVA</span>
                  <span className="text-slate-900 font-medium">{formatCurrency(0)}</span>
                </div>
              )}
              <div className="mt-3 flex justify-between items-center bg-slate-900 text-white px-4 py-3 rounded-md">
                <span className="text-sm font-semibold uppercase tracking-wide">Total TTC</span>
                <span className="text-lg font-bold">{formatCurrency(ttc)}</span>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="mb-8 p-4 bg-slate-50 rounded-md border border-slate-100">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700 mb-2">Termes et conditions</p>
            <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{invoice.terms}</p>
          </div>

          <div className="border-t border-slate-200" />

          {/* Footer */}
          <div className="flex justify-between mt-6">
            <div>
              <p className="text-xs font-semibold text-slate-800">{COMPANY_INFO.name}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                SIRET : {COMPANY_INFO.siret}<br />
                {COMPANY_INFO.vatMention}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-700">Mode de paiement</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Virement bancaire<br />
                IBAN : <span className="font-mono text-slate-800">{COMPANY_INFO.iban}</span><br />
                BIC : <span className="font-mono text-slate-800">{COMPANY_INFO.bic}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
