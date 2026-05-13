export type InvoiceStatus = 'brouillon' | 'en_attente' | 'encaisse' | 'en_retard';

export type DocumentKind = 'facture' | 'devis';

export const INVOICE_PREFIX = 'FACT';
export const QUOTE_PREFIX = 'DEV';

export function kindFromNumber(number: string): DocumentKind {
  return number.startsWith(QUOTE_PREFIX) ? 'devis' : 'facture';
}

export interface LineItem {
  id: string;
  label: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number; // 0, 5.5, 10, 20
}

export type ClientType = 'entreprise' | 'particulier';

export interface Client {
  type: ClientType;
  // Entreprise
  companyName?: string;
  siret?: string;
  // Particulier
  firstName?: string;
  lastName?: string;
  // Common
  address: string;
  postalCode: string;
  city: string;
  country: string;
}

export interface SavedClient extends Client {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  label: string;
  description: string;
  defaultQuantity: number;
  defaultUnitPrice: number;
  defaultVatRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  number: string;
  title: string;
  client: Client;
  issueDate: string; // ISO date string
  dueDate: string; // ISO date string
  dueDateType: 'reception' | '15' | '30' | '60' | 'custom';
  lines: LineItem[];
  terms: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
}
