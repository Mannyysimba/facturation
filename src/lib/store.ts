import { Invoice } from './types';

const STORAGE_KEY = 'facturation_invoices';

export function getInvoices(): Invoice[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function getInvoice(id: string): Invoice | undefined {
  return getInvoices().find((inv) => inv.id === id);
}

export function saveInvoice(invoice: Invoice): void {
  const invoices = getInvoices();
  const index = invoices.findIndex((inv) => inv.id === invoice.id);
  if (index >= 0) {
    invoices[index] = invoice;
  } else {
    invoices.push(invoice);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
}

export function deleteInvoice(id: string): void {
  const invoices = getInvoices().filter((inv) => inv.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
}

export function updateInvoiceStatus(id: string, status: Invoice['status']): void {
  const invoices = getInvoices();
  const invoice = invoices.find((inv) => inv.id === id);
  if (invoice) {
    invoice.status = status;
    invoice.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  }
}

export function generateInvoiceNumber(): string {
  const invoices = getInvoices();
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `FACT${yearMonth}-`;

  const existingNumbers = invoices
    .map((inv) => inv.number)
    .filter((num) => num.startsWith(prefix))
    .map((num) => parseInt(num.replace(prefix, ''), 10))
    .filter((n) => !isNaN(n));

  const next = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  return `${prefix}${next}`;
}
