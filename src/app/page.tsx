'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Invoice, InvoiceStatus } from '@/lib/types';
import { getInvoices, deleteInvoice, updateInvoiceStatus, saveInvoice, generateInvoiceNumber } from '@/lib/store';
import { totalTTC, formatCurrency, formatDate } from '@/lib/calculations';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export default function Dashboard() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setInvoices(getInvoices());
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

  function handleDelete() {
    if (deleteId) {
      deleteInvoice(deleteId);
      setInvoices(getInvoices());
      setDeleteId(null);
    }
  }

  function handleStatusChange(id: string, status: InvoiceStatus) {
    updateInvoiceStatus(id, status);
    setInvoices(getInvoices());
  }

  function handleDuplicate(inv: Invoice) {
    const newInvoice: Invoice = {
      ...inv,
      id: crypto.randomUUID(),
      number: generateInvoiceNumber(),
      status: 'brouillon',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lines: inv.lines.map((l) => ({ ...l, id: crypto.randomUUID() })),
    };
    saveInvoice(newInvoice);
    setInvoices(getInvoices());
  }

  if (!mounted) return null;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
        <Link href="/factures/nouvelle">
          <Button className="bg-orange-500 hover:bg-orange-600">
            + Nouvelle facture
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-sm text-gray-500">Total facturé</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(stats.total)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-green-600">Encaissé</p>
          <p className="text-2xl font-bold mt-1 text-green-700">{formatCurrency(stats.encaisse)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-orange-600">En attente</p>
          <p className="text-2xl font-bold mt-1 text-orange-700">{formatCurrency(stats.enAttente)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-red-600">En retard</p>
          <p className="text-2xl font-bold mt-1 text-red-700">{formatCurrency(stats.enRetard)}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Rechercher par n°, client, projet..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="brouillon">Brouillon</SelectItem>
            <SelectItem value="en_attente">En attente</SelectItem>
            <SelectItem value="encaisse">Encaissé</SelectItem>
            <SelectItem value="en_retard">En retard</SelectItem>
          </SelectContent>
        </Select>
        {years.length > 0 && (
          <Select value={yearFilter} onValueChange={(v) => setYearFilter(v || 'all')}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Année" />
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
        <Card className="p-12 text-center">
          <p className="text-gray-500">Aucune facture trouvée.</p>
          <Link href="/factures/nouvelle">
            <Button className="mt-4 bg-orange-500 hover:bg-orange-600">
              Créer ma première facture
            </Button>
          </Link>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° / Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Titre / Projet</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead className="text-right">Total TTC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <div className="font-medium">{inv.number}</div>
                    <div className="text-xs text-gray-500">{formatDate(inv.issueDate)}</div>
                  </TableCell>
                  <TableCell>{clientName(inv)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{inv.title}</TableCell>
                  <TableCell>{formatDate(inv.dueDate)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(totalTTC(inv.lines))}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${STATUS_COLORS[inv.status]} border-0`}>
                      {STATUS_LABELS[inv.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="sm" />}
                      >
                        •••
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
                          Marquer encaissé
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
        </Card>
      )}

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette facture ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La facture sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
