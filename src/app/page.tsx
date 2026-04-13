'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Invoice, InvoiceStatus } from '@/lib/types';
import { getInvoices, deleteInvoice, updateInvoiceStatus, saveInvoice, generateInvoiceNumber } from '@/lib/store';
import { UserButton } from '@clerk/nextjs';
import { Logo } from '@/components/logo';
import { totalTTC, formatCurrency, formatDate } from '@/lib/calculations';
import { STATUS_LABELS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function clientName(invoice: Invoice): string {
  if (invoice.client.type === 'entreprise') return invoice.client.companyName || '';
  return `${invoice.client.firstName || ''} ${invoice.client.lastName || ''}`.trim();
}

const STATUS_DOT: Record<string, string> = {
  brouillon: 'bg-zinc-400',
  en_attente: 'bg-amber-400',
  encaisse: 'bg-emerald-500',
  en_retard: 'bg-red-500',
};

export default function Dashboard() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  async function refresh() {
    setInvoices(await getInvoices());
  }

  useEffect(() => {
    setMounted(true);
    refresh();
  }, []);

  const years = useMemo(() => {
    const set = new Set(invoices.map((inv) => new Date(inv.issueDate).getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [invoices]);

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (yearFilter !== 'all' && new Date(inv.issueDate).getFullYear() !== parseInt(yearFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = clientName(inv).toLowerCase();
        return (
          inv.number.toLowerCase().includes(q) ||
          name.includes(q) ||
          inv.title.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [invoices, search, statusFilter, yearFilter]);

  const stats = useMemo(() => {
    const total = invoices.reduce((s, inv) => s + totalTTC(inv.lines), 0);
    const encaisse = invoices
      .filter((inv) => inv.status === 'encaisse')
      .reduce((s, inv) => s + totalTTC(inv.lines), 0);
    const enAttente = invoices
      .filter((inv) => inv.status === 'en_attente')
      .reduce((s, inv) => s + totalTTC(inv.lines), 0);
    const enRetard = invoices
      .filter((inv) => inv.status === 'en_retard')
      .reduce((s, inv) => s + totalTTC(inv.lines), 0);
    return { total, encaisse, enAttente, enRetard };
  }, [invoices]);

  async function handleDelete() {
    if (deleteId) {
      await deleteInvoice(deleteId);
      await refresh();
      setDeleteId(null);
    }
  }

  async function handleStatusChange(id: string, status: InvoiceStatus) {
    await updateInvoiceStatus(id, status);
    await refresh();
  }

  async function handleDuplicate(inv: Invoice) {
    const newInvoice: Invoice = {
      ...inv,
      id: crypto.randomUUID(),
      number: await generateInvoiceNumber(),
      status: 'brouillon',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lines: inv.lines.map((l) => ({ ...l, id: crypto.randomUUID() })),
    };
    await saveInvoice(newInvoice);
    await refresh();
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={36} className="rounded-lg border border-zinc-200" />
            <div>
              <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">Factures</h1>
              <p className="text-sm text-zinc-500 mt-0.5">{invoices.length} facture{invoices.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/factures/nouvelle">
              <Button className="bg-zinc-900 hover:bg-zinc-800 text-white text-sm h-9 px-4">
                Nouvelle facture
              </Button>
            </Link>
            <UserButton />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-px bg-zinc-200 rounded-lg overflow-hidden">
          <div className="bg-white p-4">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Total factur&eacute;</p>
            <p className="text-xl font-semibold text-zinc-900 mt-1">{formatCurrency(stats.total)}</p>
          </div>
          <div className="bg-white p-4">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Encaiss&eacute;</p>
            <p className="text-xl font-semibold text-zinc-900 mt-1">{formatCurrency(stats.encaisse)}</p>
          </div>
          <div className="bg-white p-4">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">En attente</p>
            <p className="text-xl font-semibold text-zinc-900 mt-1">{formatCurrency(stats.enAttente)}</p>
          </div>
          <div className="bg-white p-4">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">En retard</p>
            <p className="text-xl font-semibold text-zinc-900 mt-1">{formatCurrency(stats.enRetard)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs h-9 text-sm bg-white border-zinc-200"
          />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || 'all')}>
            <SelectTrigger className="w-40 h-9 text-sm bg-white border-zinc-200">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="brouillon">Brouillon</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="encaisse">Encaiss&eacute;</SelectItem>
              <SelectItem value="en_retard">En retard</SelectItem>
            </SelectContent>
          </Select>
          {years.length > 0 && (
            <Select value={yearFilter} onValueChange={(v) => setYearFilter(v || 'all')}>
              <SelectTrigger className="w-28 h-9 text-sm bg-white border-zinc-200">
                <SelectValue placeholder="Ann&eacute;e" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="border border-zinc-200 rounded-lg py-16 text-center">
            <p className="text-zinc-400 text-sm">Aucune facture</p>
            <Link href="/factures/nouvelle">
              <Button variant="outline" className="mt-4 text-sm h-9 border-zinc-200">
                Cr&eacute;er une facture
              </Button>
            </Link>
          </div>
        ) : (
          <div className="border border-zinc-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                  <TableHead className="text-xs font-medium text-zinc-500 uppercase tracking-wide">N&deg;</TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Client</TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Projet</TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500 uppercase tracking-wide">&Eacute;ch&eacute;ance</TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500 uppercase tracking-wide text-right">Montant</TableHead>
                  <TableHead className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Statut</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => (
                  <TableRow
                    key={inv.id}
                    className="cursor-pointer hover:bg-zinc-50"
                    onClick={() => router.push(`/factures/${inv.id}`)}
                  >
                    <TableCell className="text-sm">
                      <span className="font-medium text-zinc-900">{inv.number}</span>
                      <span className="block text-xs text-zinc-400">{formatDate(inv.issueDate)}</span>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-700">{clientName(inv)}</TableCell>
                    <TableCell className="text-sm text-zinc-500 max-w-[180px] truncate">{inv.title}</TableCell>
                    <TableCell className="text-sm text-zinc-500">{formatDate(inv.dueDate)}</TableCell>
                    <TableCell className="text-sm text-right font-medium text-zinc-900">
                      {formatCurrency(totalTTC(inv.lines))}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[inv.status]}`} />
                        {STATUS_LABELS[inv.status]}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<button className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600" />}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="3" r="1.5" fill="currentColor"/>
                            <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
                            <circle cx="8" cy="13" r="1.5" fill="currentColor"/>
                          </svg>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/factures/${inv.id}`)}>
                            Voir
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/factures/${inv.id}/modifier`)}>
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(inv)}>
                            Dupliquer
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleStatusChange(inv.id, 'en_attente')}>
                            Marquer en attente
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(inv.id, 'encaisse')}>
                            Marquer encaiss&eacute;
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(inv.id, 'en_retard')}>
                            Marquer en retard
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteId(inv.id)}
                          >
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette facture ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irr&eacute;versible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
