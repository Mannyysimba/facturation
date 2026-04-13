'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Invoice, LineItem, ClientType, SavedClient, Service } from '@/lib/types';
import { DEFAULT_TERMS, VAT_RATES } from '@/lib/constants';
import { generateInvoiceNumber, saveInvoice, getInvoice, getClients, upsertClientFromInvoice, deleteClient, getServices, upsertServiceFromLine } from '@/lib/store';
import { lineTotal, totalHT, vatBreakdown, totalTTC, formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function createLineItem(): LineItem {
  return {
    id: crypto.randomUUID(),
    label: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    vatRate: 0,
  };
}

function computeDueDate(issueDate: string, type: string): string {
  const date = new Date(issueDate);
  switch (type) {
    case '15': date.setDate(date.getDate() + 15); break;
    case '30': date.setDate(date.getDate() + 30); break;
    case '60': date.setDate(date.getDate() + 60); break;
    default: break;
  }
  return date.toISOString().split('T')[0];
}

interface InvoiceFormProps {
  invoiceId?: string;
}

export default function InvoiceForm({ invoiceId }: InvoiceFormProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [number, setNumber] = useState('');
  const [title, setTitle] = useState('');
  const [clientType, setClientType] = useState<ClientType>('entreprise');
  const [companyName, setCompanyName] = useState('');
  const [clientSiret, setClientSiret] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('France');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDateType, setDueDateType] = useState<string>('30');
  const [customDueDate, setCustomDueDate] = useState('');
  const [lines, setLines] = useState<LineItem[]>([createLineItem()]);
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [existingStatus, setExistingStatus] = useState<Invoice['status']>('brouillon');
  const [existingId, setExistingId] = useState<string>('');
  const [savedClients, setSavedClients] = useState<SavedClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('new');
  const [services, setServices] = useState<Service[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
    (async () => {
      const [cs, ss] = await Promise.all([getClients(), getServices()]);
      setSavedClients(cs);
      setServices(ss);
      if (invoiceId) {
        const inv = await getInvoice(invoiceId);
        if (inv) {
          setNumber(inv.number);
          setTitle(inv.title);
          setClientType(inv.client.type);
          setCompanyName(inv.client.companyName || '');
          setClientSiret(inv.client.siret || '');
          setFirstName(inv.client.firstName || '');
          setLastName(inv.client.lastName || '');
          setAddress(inv.client.address);
          setPostalCode(inv.client.postalCode);
          setCity(inv.client.city);
          setCountry(inv.client.country);
          setIssueDate(inv.issueDate);
          setDueDateType(inv.dueDateType);
          if (inv.dueDateType === 'custom') setCustomDueDate(inv.dueDate);
          setLines(inv.lines.length > 0 ? inv.lines : [createLineItem()]);
          setTerms(inv.terms);
          setExistingStatus(inv.status);
          setExistingId(inv.id);
        }
      } else {
        setNumber(await generateInvoiceNumber());
      }
    })();
  }, [invoiceId]);

  if (!mounted) return null;

  const dueDate = dueDateType === 'custom'
    ? customDueDate
    : dueDateType === 'reception'
      ? issueDate
      : computeDueDate(issueDate, dueDateType);

  function updateLine(id: string, field: keyof LineItem, value: string | number) {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }

  function handleSelectClient(id: string) {
    setSelectedClientId(id);
    if (id === 'new') {
      setClientType('entreprise');
      setCompanyName('');
      setClientSiret('');
      setFirstName('');
      setLastName('');
      setAddress('');
      setPostalCode('');
      setCity('');
      setCountry('France');
      return;
    }
    const c = savedClients.find((x) => x.id === id);
    if (!c) return;
    setClientType(c.type);
    setCompanyName(c.companyName || '');
    setClientSiret(c.siret || '');
    setFirstName(c.firstName || '');
    setLastName(c.lastName || '');
    setAddress(c.address);
    setPostalCode(c.postalCode);
    setCity(c.city);
    setCountry(c.country);
  }

  async function handleDeleteSelectedClient() {
    if (selectedClientId === 'new') return;
    await deleteClient(selectedClientId);
    setSavedClients(await getClients());
    handleSelectClient('new');
  }

  async function buildInvoice(status: Invoice['status']): Promise<Invoice> {
    const now = new Date().toISOString();
    const existing = invoiceId ? await getInvoice(invoiceId) : undefined;
    return {
      id: existingId || crypto.randomUUID(),
      number,
      title,
      client: {
        type: clientType,
        companyName: clientType === 'entreprise' ? companyName : undefined,
        siret: clientType === 'entreprise' ? clientSiret : undefined,
        firstName: clientType === 'particulier' ? firstName : undefined,
        lastName: clientType === 'particulier' ? lastName : undefined,
        address,
        postalCode,
        city,
        country,
      },
      issueDate,
      dueDate,
      dueDateType: dueDateType as Invoice['dueDateType'],
      lines,
      terms,
      status,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
  }

  async function persistLineServices(lines: LineItem[]) {
    await Promise.all(lines.map((l) => upsertServiceFromLine(l)));
  }

  async function handleSaveDraft() {
    setSaveError(null);
    setSaving(true);
    try {
      const invoice = await buildInvoice(existingStatus === 'brouillon' ? 'brouillon' : existingStatus);
      await upsertClientFromInvoice(invoice.client);
      await persistLineServices(invoice.lines);
      await saveInvoice(invoice);
      router.push('/');
    } catch (e) {
      console.error('Save draft failed:', e);
      setSaveError(e instanceof Error ? e.message : 'Erreur inconnue lors de l\'enregistrement');
      setSaving(false);
    }
  }

  async function handleSaveAndPreview() {
    setSaveError(null);
    setSaving(true);
    try {
      const invoice = await buildInvoice(existingStatus === 'brouillon' ? 'en_attente' : existingStatus);
      await upsertClientFromInvoice(invoice.client);
      await persistLineServices(invoice.lines);
      await saveInvoice(invoice);
      router.push(`/factures/${invoice.id}`);
    } catch (e) {
      console.error('Save & preview failed:', e);
      setSaveError(e instanceof Error ? e.message : 'Erreur inconnue lors de l\'enregistrement');
      setSaving(false);
    }
  }

  function applyService(lineId: string, serviceId: string) {
    if (serviceId === 'new') return;
    const s = services.find((x) => x.id === serviceId);
    if (!s) return;
    setLines((prev) => prev.map((l) => l.id === lineId ? {
      ...l,
      label: s.label,
      description: s.description,
      quantity: s.defaultQuantity,
      unitPrice: s.defaultUnitPrice,
      vatRate: s.defaultVatRate,
    } : l));
  }

  function clientOptionLabel(c: SavedClient): string {
    if (c.type === 'entreprise') return c.companyName || 'Sans nom';
    return `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Sans nom';
  }

  const vatItems = vatBreakdown(lines);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-zinc-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">
            {invoiceId ? 'Modifier la facture' : 'Nouvelle facture'}
          </h1>
          <Button variant="outline" onClick={() => router.push('/')} className="h-8 text-sm border-zinc-200">
            Retour
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Client */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Client</h2>
            {selectedClientId !== 'new' && (
              <button
                onClick={handleDeleteSelectedClient}
                className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
              >
                Supprimer ce client
              </button>
            )}
          </div>

          {savedClients.length > 0 && (
            <div>
              <Label className="text-sm text-zinc-600">S&eacute;lectionner un client</Label>
              <Select value={selectedClientId} onValueChange={(v) => handleSelectClient(v || 'new')}>
                <SelectTrigger className="mt-1 h-9 bg-white border-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">+ Nouveau client</SelectItem>
                  {savedClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {clientOptionLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-1 p-0.5 bg-zinc-100 rounded-md w-fit">
            <button
              onClick={() => setClientType('entreprise')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${clientType === 'entreprise' ? 'bg-white text-zinc-900 shadow-sm font-medium' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              Entreprise
            </button>
            <button
              onClick={() => setClientType('particulier')}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${clientType === 'particulier' ? 'bg-white text-zinc-900 shadow-sm font-medium' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              Particulier
            </button>
          </div>

          {clientType === 'entreprise' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-zinc-600">Nom de l&apos;entreprise</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-1 h-9 bg-white border-zinc-200" />
              </div>
              <div>
                <Label className="text-sm text-zinc-600">SIRET</Label>
                <Input value={clientSiret} onChange={(e) => setClientSiret(e.target.value)} className="mt-1 h-9 bg-white border-zinc-200" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-zinc-600">Pr&eacute;nom</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1 h-9 bg-white border-zinc-200" />
              </div>
              <div>
                <Label className="text-sm text-zinc-600">Nom</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1 h-9 bg-white border-zinc-200" />
              </div>
            </div>
          )}

          <div>
            <Label className="text-sm text-zinc-600">Adresse</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 h-9 bg-white border-zinc-200" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm text-zinc-600">Code postal</Label>
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="mt-1 h-9 bg-white border-zinc-200" />
            </div>
            <div>
              <Label className="text-sm text-zinc-600">Ville</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 h-9 bg-white border-zinc-200" />
            </div>
            <div>
              <Label className="text-sm text-zinc-600">Pays</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1 h-9 bg-white border-zinc-200" />
            </div>
          </div>
        </section>

        <div className="border-t border-zinc-100" />

        {/* Facture info */}
        <section className="space-y-4">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Facture</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-zinc-600">Num&eacute;ro</Label>
              <Input value={number} onChange={(e) => setNumber(e.target.value)} className="mt-1 h-9 bg-white border-zinc-200 font-mono text-sm" />
            </div>
            <div>
              <Label className="text-sm text-zinc-600">Titre / R&eacute;f&eacute;rence projet</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: FAIDHERBE N°6" className="mt-1 h-9 bg-white border-zinc-200" />
            </div>
            <div>
              <Label className="text-sm text-zinc-600">Date d&apos;&eacute;mission</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="mt-1 h-9 bg-white border-zinc-200" />
            </div>
            <div>
              <Label className="text-sm text-zinc-600">&Eacute;ch&eacute;ance</Label>
              <Select value={dueDateType} onValueChange={(v) => setDueDateType(v || '30')}>
                <SelectTrigger className="mt-1 h-9 bg-white border-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reception">&Agrave; r&eacute;ception</SelectItem>
                  <SelectItem value="15">15 jours</SelectItem>
                  <SelectItem value="30">30 jours</SelectItem>
                  <SelectItem value="60">60 jours</SelectItem>
                  <SelectItem value="custom">Date personnalis&eacute;e</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dueDateType === 'custom' && (
              <div>
                <Label className="text-sm text-zinc-600">Date d&apos;&eacute;ch&eacute;ance</Label>
                <Input type="date" value={customDueDate} onChange={(e) => setCustomDueDate(e.target.value)} className="mt-1 h-9 bg-white border-zinc-200" />
              </div>
            )}
          </div>
        </section>

        <div className="border-t border-zinc-100" />

        {/* Lignes */}
        <section className="space-y-4">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Prestations</h2>

          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div key={line.id} className="border border-zinc-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-medium">Ligne {idx + 1}</span>
                  <button
                    onClick={() => removeLine(line.id)}
                    className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
                {services.length > 0 && (
                  <div>
                    <Label className="text-xs text-zinc-500">Prestation enregistr&eacute;e</Label>
                    <Select value="new" onValueChange={(v) => applyService(line.id, v || 'new')}>
                      <SelectTrigger className="mt-1 h-9 bg-white border-zinc-200">
                        <SelectValue placeholder="S&eacute;lectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">&mdash; Choisir une prestation &mdash;</SelectItem>
                        {services.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Input
                    value={line.label}
                    onChange={(e) => updateLine(line.id, 'label', e.target.value)}
                    placeholder="Libell&eacute;"
                    className="h-9 bg-white border-zinc-200"
                  />
                </div>
                <div>
                  <Input
                    value={line.description}
                    onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                    placeholder="Description (optionnelle)"
                    className="h-9 bg-white border-zinc-200 text-sm"
                  />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs text-zinc-500">Quantit&eacute;</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="mt-1 h-9 bg-white border-zinc-200"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">Prix unit. HT</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(line.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="mt-1 h-9 bg-white border-zinc-200"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">TVA</Label>
                    <Select
                      value={String(line.vatRate)}
                      onValueChange={(v) => updateLine(line.id, 'vatRate', parseFloat(v || '0'))}
                    >
                      <SelectTrigger className="mt-1 h-9 bg-white border-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VAT_RATES.map((rate) => (
                          <SelectItem key={rate} value={String(rate)}>
                            {rate}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">Total HT</Label>
                    <div className="mt-1 h-9 flex items-center text-sm font-medium text-zinc-900">
                      {formatCurrency(lineTotal(line))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setLines((prev) => [...prev, createLineItem()])}
            className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            + Ajouter une ligne
          </button>

          {/* Totaux */}
          <div className="flex justify-end pt-4">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Total HT</span>
                <span className="text-zinc-900">{formatCurrency(totalHT(lines))}</span>
              </div>
              {vatItems.map((v) => (
                <div key={v.rate} className="flex justify-between text-sm text-zinc-500">
                  <span>TVA {v.rate}%</span>
                  <span className="text-zinc-900">{formatCurrency(v.amount)}</span>
                </div>
              ))}
              {vatItems.length === 0 && (
                <div className="flex justify-between text-sm text-zinc-500">
                  <span>TVA</span>
                  <span className="text-zinc-900">{formatCurrency(0)}</span>
                </div>
              )}
              <div className="border-t border-zinc-200 pt-2 flex justify-between text-base font-semibold text-zinc-900">
                <span>Total TTC</span>
                <span>{formatCurrency(totalTTC(lines))}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="border-t border-zinc-100" />

        {/* Termes */}
        <section className="space-y-3">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Termes et conditions</h2>
          <Textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={5}
            className="text-sm bg-white border-zinc-200 resize-none"
          />
        </section>

        {/* Actions */}
        <div className="pt-4 pb-12 space-y-3">
          {saveError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {saveError}
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleSaveDraft} disabled={saving} className="h-9 text-sm border-zinc-200">
              {saving ? 'Enregistrement...' : 'Enregistrer en brouillon'}
            </Button>
            <Button onClick={handleSaveAndPreview} disabled={saving} className="h-9 text-sm bg-zinc-900 hover:bg-zinc-800 text-white">
              {saving ? 'Enregistrement...' : 'Enregistrer et pr\u00e9visualiser'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
