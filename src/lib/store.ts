'use server';

import { auth } from '@clerk/nextjs/server';
import { sql } from './db';
import { Invoice, Client, SavedClient, LineItem, Service } from './types';

async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

type InvoiceRow = {
  id: string;
  number: string;
  title: string;
  client_data: Client;
  issue_date: string;
  due_date: string;
  due_date_type: Invoice['dueDateType'];
  lines: Invoice['lines'];
  terms: string;
  status: Invoice['status'];
  created_at: string;
  updated_at: string;
};

type ServiceRow = {
  id: string;
  label: string;
  description: string;
  default_quantity: string;
  default_unit_price: string;
  default_vat_rate: string;
  created_at: string;
  updated_at: string;
};

type ClientRow = {
  id: string;
  type: SavedClient['type'];
  company_name: string | null;
  siret: string | null;
  first_name: string | null;
  last_name: string | null;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  created_at: string;
  updated_at: string;
};

function toDateStr(d: string): string {
  return new Date(d).toISOString().split('T')[0];
}

function rowToInvoice(r: InvoiceRow): Invoice {
  return {
    id: r.id,
    number: r.number,
    title: r.title,
    client: r.client_data,
    issueDate: toDateStr(r.issue_date),
    dueDate: toDateStr(r.due_date),
    dueDateType: r.due_date_type,
    lines: r.lines,
    terms: r.terms,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToService(r: ServiceRow): Service {
  return {
    id: r.id,
    label: r.label,
    description: r.description,
    defaultQuantity: Number(r.default_quantity),
    defaultUnitPrice: Number(r.default_unit_price),
    defaultVatRate: Number(r.default_vat_rate),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToClient(r: ClientRow): SavedClient {
  return {
    id: r.id,
    type: r.type,
    companyName: r.company_name || undefined,
    siret: r.siret || undefined,
    firstName: r.first_name || undefined,
    lastName: r.last_name || undefined,
    address: r.address,
    postalCode: r.postal_code,
    city: r.city,
    country: r.country,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ---------- Invoices ----------

export async function getInvoices(): Promise<Invoice[]> {
  const userId = await requireUserId();
  const rows = (await sql`
    SELECT id, number, title, client_data, issue_date, due_date, due_date_type,
           lines, terms, status, created_at, updated_at
    FROM invoices
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `) as InvoiceRow[];
  return rows.map(rowToInvoice);
}

export async function getInvoice(id: string): Promise<Invoice | undefined> {
  const userId = await requireUserId();
  const rows = (await sql`
    SELECT id, number, title, client_data, issue_date, due_date, due_date_type,
           lines, terms, status, created_at, updated_at
    FROM invoices WHERE id = ${id} AND user_id = ${userId}
  `) as InvoiceRow[];
  return rows[0] ? rowToInvoice(rows[0]) : undefined;
}

export async function saveInvoice(invoice: Invoice): Promise<void> {
  const userId = await requireUserId();
  await sql`
    INSERT INTO invoices (
      id, user_id, number, title, client_data, issue_date, due_date, due_date_type,
      lines, terms, status, created_at, updated_at
    ) VALUES (
      ${invoice.id}, ${userId}, ${invoice.number}, ${invoice.title},
      ${JSON.stringify(invoice.client)}::jsonb,
      ${invoice.issueDate}, ${invoice.dueDate}, ${invoice.dueDateType},
      ${JSON.stringify(invoice.lines)}::jsonb,
      ${invoice.terms}, ${invoice.status},
      ${invoice.createdAt}, ${invoice.updatedAt}
    )
    ON CONFLICT (id) DO UPDATE SET
      number = EXCLUDED.number,
      title = EXCLUDED.title,
      client_data = EXCLUDED.client_data,
      issue_date = EXCLUDED.issue_date,
      due_date = EXCLUDED.due_date,
      due_date_type = EXCLUDED.due_date_type,
      lines = EXCLUDED.lines,
      terms = EXCLUDED.terms,
      status = EXCLUDED.status,
      updated_at = NOW()
    WHERE invoices.user_id = ${userId}
  `;
}

export async function deleteInvoice(id: string): Promise<void> {
  const userId = await requireUserId();
  await sql`DELETE FROM invoices WHERE id = ${id} AND user_id = ${userId}`;
}

export async function updateInvoiceStatus(id: string, status: Invoice['status']): Promise<void> {
  const userId = await requireUserId();
  await sql`UPDATE invoices SET status = ${status}, updated_at = NOW() WHERE id = ${id} AND user_id = ${userId}`;
}

export async function generateInvoiceNumber(): Promise<string> {
  const userId = await requireUserId();
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `FACT${yearMonth}-`;

  const rows = (await sql`
    SELECT number FROM invoices
    WHERE user_id = ${userId} AND number LIKE ${prefix + '%'}
  `) as { number: string }[];

  const existingNumbers = rows
    .map((r) => parseInt(r.number.replace(prefix, ''), 10))
    .filter((n) => !isNaN(n));

  const next = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  return `${prefix}${next}`;
}

// ---------- Clients ----------

export async function getClients(): Promise<SavedClient[]> {
  const userId = await requireUserId();
  const rows = (await sql`
    SELECT id, type, company_name, siret, first_name, last_name,
           address, postal_code, city, country, created_at, updated_at
    FROM clients
    WHERE user_id = ${userId}
    ORDER BY COALESCE(company_name, last_name, first_name) ASC
  `) as ClientRow[];
  return rows.map(rowToClient);
}

export async function getClient(id: string): Promise<SavedClient | undefined> {
  const userId = await requireUserId();
  const rows = (await sql`
    SELECT id, type, company_name, siret, first_name, last_name,
           address, postal_code, city, country, created_at, updated_at
    FROM clients WHERE id = ${id} AND user_id = ${userId}
  `) as ClientRow[];
  return rows[0] ? rowToClient(rows[0]) : undefined;
}

export async function deleteClient(id: string): Promise<void> {
  const userId = await requireUserId();
  await sql`DELETE FROM clients WHERE id = ${id} AND user_id = ${userId}`;
}

export async function upsertClientFromInvoice(client: Client): Promise<SavedClient | null> {
  const userId = await requireUserId();
  const hasName = client.type === 'entreprise'
    ? !!(client.companyName && client.companyName.trim())
    : !!((client.firstName && client.firstName.trim()) || (client.lastName && client.lastName.trim()));
  if (!hasName) return null;

  const name = client.type === 'entreprise'
    ? (client.companyName || '').trim().toLowerCase()
    : `${client.firstName || ''} ${client.lastName || ''}`.trim().toLowerCase();
  const addr = (client.address || '').trim().toLowerCase();

  const existing = (await sql`
    SELECT id, type, company_name, siret, first_name, last_name,
           address, postal_code, city, country, created_at, updated_at
    FROM clients
    WHERE user_id = ${userId}
      AND type = ${client.type}
      AND LOWER(TRIM(COALESCE(
        CASE WHEN type = 'entreprise' THEN company_name
             ELSE CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))
        END, ''))) = ${name}
      AND LOWER(TRIM(COALESCE(address, ''))) = ${addr}
    LIMIT 1
  `) as ClientRow[];

  if (existing[0]) {
    const rows = (await sql`
      UPDATE clients SET
        company_name = ${client.companyName || null},
        siret = ${client.siret || null},
        first_name = ${client.firstName || null},
        last_name = ${client.lastName || null},
        address = ${client.address},
        postal_code = ${client.postalCode},
        city = ${client.city},
        country = ${client.country},
        updated_at = NOW()
      WHERE id = ${existing[0].id} AND user_id = ${userId}
      RETURNING id, type, company_name, siret, first_name, last_name,
                address, postal_code, city, country, created_at, updated_at
    `) as ClientRow[];
    return rowToClient(rows[0]);
  }

  const rows = (await sql`
    INSERT INTO clients (user_id, type, company_name, siret, first_name, last_name,
                         address, postal_code, city, country)
    VALUES (
      ${userId},
      ${client.type},
      ${client.companyName || null},
      ${client.siret || null},
      ${client.firstName || null},
      ${client.lastName || null},
      ${client.address},
      ${client.postalCode},
      ${client.city},
      ${client.country}
    )
    RETURNING id, type, company_name, siret, first_name, last_name,
              address, postal_code, city, country, created_at, updated_at
  `) as ClientRow[];
  return rowToClient(rows[0]);
}

// ---------- Services ----------

export async function getServices(): Promise<Service[]> {
  const userId = await requireUserId();
  const rows = (await sql`
    SELECT id, label, description, default_quantity, default_unit_price,
           default_vat_rate, created_at, updated_at
    FROM services
    WHERE user_id = ${userId}
    ORDER BY label ASC
  `) as ServiceRow[];
  return rows.map(rowToService);
}

export async function deleteService(id: string): Promise<void> {
  const userId = await requireUserId();
  await sql`DELETE FROM services WHERE id = ${id} AND user_id = ${userId}`;
}

export async function upsertServiceFromLine(line: LineItem): Promise<Service | null> {
  const userId = await requireUserId();
  const label = (line.label || '').trim();
  if (!label) return null;

  const existing = (await sql`
    SELECT id FROM services
    WHERE user_id = ${userId} AND LOWER(TRIM(label)) = ${label.toLowerCase()}
    LIMIT 1
  `) as { id: string }[];

  if (existing[0]) {
    const rows = (await sql`
      UPDATE services SET
        description = ${line.description || ''},
        default_quantity = ${line.quantity},
        default_unit_price = ${line.unitPrice},
        default_vat_rate = ${line.vatRate},
        updated_at = NOW()
      WHERE id = ${existing[0].id} AND user_id = ${userId}
      RETURNING id, label, description, default_quantity, default_unit_price,
                default_vat_rate, created_at, updated_at
    `) as ServiceRow[];
    return rowToService(rows[0]);
  }

  const rows = (await sql`
    INSERT INTO services (user_id, label, description, default_quantity, default_unit_price, default_vat_rate)
    VALUES (${userId}, ${label}, ${line.description || ''}, ${line.quantity}, ${line.unitPrice}, ${line.vatRate})
    RETURNING id, label, description, default_quantity, default_unit_price,
              default_vat_rate, created_at, updated_at
  `) as ServiceRow[];
  return rowToService(rows[0]);
}
