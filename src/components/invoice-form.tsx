'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Invoice, LineItem, ClientType } from '@/lib/types';
import { DEFAULT_TERMS, VAT_RATES } from '@/lib/constants';
import { generateInvoiceNumber, saveInvoice, getInvoice } from '@/lib/store';
import { lineTotal, totalHT, vatBreakdown, totalVAT, totalTTC, formatCurrency } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

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

  useEffect(() => {
    setMounted(true);
    if (invoiceId) {
      const inv = getInvoice(invoiceId);
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
      setNumber(generateInvoiceNumber());
    }
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

  function buildInvoice(status: Invoice['status']): Invoice {
    const now = new Date().toISOString();
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
      createdAt: invoiceId ? (getInvoice(invoiceId)?.createdAt || now) : now,
      updatedAt: now,
    };
  }

  function handleSaveDraft() {
    const invoice = buildInvoice(existingStatus === 'brouillon' ? 'brouillon' : existingStatus);
    saveInvoice(invoice);
    router.push('/');
  }

  function handleSaveAndPreview() {
    const invoice = buildInvoice(existingStatus === 'brouillon' ? 'en_attente' : existingStatus);
    saveInvoice(invoice);
    router.push(`/factures/${invoice.id}`);
  }

  const vatItems = vatBreakdown(lines);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {invoiceId ? 'Modifier la facture' : 'Nouvelle facture'}
        </h1>
        <Button variant="outline" onClick={() => router.push('/')}>
          Retour
        </Button>
      </div>

      {/* Section CLIENT */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Client</h2>
        <div className="flex gap-2">
          <Button
            variant={clientType === 'entreprise' ? 'default' : 'outline'}
            onClick={() => setClientType('entreprise')}
            className={clientType === 'entreprise' ? 'bg-orange-500 hover:bg-orange-600' : ''}
          >
            Entreprise
          </Button>
          <Button
            variant={clientType === 'particulier' ? 'default' : 'outline'}
            onClick={() => setClientType('particulier')}
            className={clientType === 'particulier' ? 'bg-orange-500 hover:bg-orange-600' : ''}
          >
            Particulier
          </Button>
        </div>

        {clientType === 'entreprise' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nom de l&apos;entreprise</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nom de l'entreprise" />
            </div>
            <div>
              <Label>SIRET</Label>
              <Input value={clientSiret} onChange={(e) => setClientSiret(e.target.value)} placeholder="SIRET" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Prénom</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" />
            </div>
            <div>
              <Label>Nom</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Adresse</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adresse" />
          </div>
          <div>
            <Label>Code postal</Label>
            <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Code postal" />
          </div>
          <div>
            <Label>Ville</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" />
          </div>
          <div>
            <Label>Pays</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Pays" />
          </div>
        </div>
      </Card>

      {/* Section FACTURE */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Facture</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Numéro de facture</Label>
            <Input value={number} onChange={(e) => setNumber(e.target.value)} />
          </div>
          <div>
            <Label>Titre / Référence projet</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: FAIDHERBE N°6" />
          </div>
          <div>
            <Label>Date d&apos;émission</Label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div>
            <Label>Échéance de paiement</Label>
            <Select value={dueDateType} onValueChange={(v) => setDueDateType(v || '30')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reception">À réception</SelectItem>
                <SelectItem value="15">15 jours</SelectItem>
                <SelectItem value="30">30 jours</SelectItem>
                <SelectItem value="60">60 jours</SelectItem>
                <SelectItem value="custom">Date personnalisée</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {dueDateType === 'custom' && (
            <div>
              <Label>Date d&apos;échéance</Label>
              <Input type="date" value={customDueDate} onChange={(e) => setCustomDueDate(e.target.value)} />
            </div>
          )}
        </div>
      </Card>

      {/* Section LIGNES */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Prestations</h2>
        <div className="space-y-4">
          {lines.map((line, idx) => (
            <div key={line.id} className="border rounded-lg p-4 space-y-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Ligne {idx + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => removeLine(line.id)}
                >
                  Supprimer
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <Label>Libellé</Label>
                  <Input
                    value={line.label}
                    onChange={(e) => updateLine(line.id, 'label', e.target.value)}
                    placeholder="Libellé de la prestation"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Description (optionnelle)</Label>
                  <Input
                    value={line.description}
                    onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                    placeholder="Description"
                  />
                </div>
                <div>
                  <Label>Quantité</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.quantity}
                    onChange={(e) => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>Prix unitaire HT (€)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(e) => updateLine(line.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>TVA (%)</Label>
                  <Select
                    value={String(line.vatRate)}
                    onValueChange={(v) => updateLine(line.id, 'vatRate', parseFloat(v || '0'))}
                  >
                    <SelectTrigger>
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
                  <Label>Total HT</Label>
                  <div className="h-9 flex items-center text-sm font-medium">
                    {formatCurrency(lineTotal(line))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          onClick={() => setLines((prev) => [...prev, createLineItem()])}
          className="border-orange-300 text-orange-600 hover:bg-orange-50"
        >
          + Ajouter une ligne
        </Button>

        <Separator />

        {/* Totaux */}
        <div className="flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total HT</span>
              <span>{formatCurrency(totalHT(lines))}</span>
            </div>
            {vatItems.map((v) => (
              <div key={v.rate} className="flex justify-between text-sm">
                <span>TVA {v.rate}%</span>
                <span>{formatCurrency(v.amount)}</span>
              </div>
            ))}
            {vatItems.length === 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>TVA</span>
                <span>{formatCurrency(0)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total TTC</span>
              <span>{formatCurrency(totalTTC(lines))}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Section TERMES */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Termes et conditions</h2>
        <Textarea
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          rows={6}
          className="text-sm"
        />
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end pb-8">
        <Button variant="outline" onClick={handleSaveDraft}>
          Enregistrer en brouillon
        </Button>
        <Button
          onClick={handleSaveAndPreview}
          className="bg-orange-500 hover:bg-orange-600"
        >
          Enregistrer et prévisualiser
        </Button>
      </div>
    </div>
  );
}
