'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Invoice } from '@/lib/types';
import { COMPANY_INFO } from '@/lib/constants';
import { lineTotal, totalHT, vatBreakdown, totalTTC } from '@/lib/calculations';

function fmtCurrency(amount: number): string {
  return amount.toFixed(2).replace('.', ',') + ' €';
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// Palette (slate + indigo accent)
const slate900 = '#0f172a';
const slate800 = '#1e293b';
const slate700 = '#334155';
const slate600 = '#475569';
const slate500 = '#64748b';
const slate400 = '#94a3b8';
const slate200 = '#e2e8f0';
const slate100 = '#f1f5f9';
const slate50 = '#f8fafc';
const indigo700 = '#4338ca';
const indigo50 = '#eef2ff';
const indigo100 = '#e0e7ff';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: slate800,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 26,
  },
  headerCol: { width: '48%' },
  companyName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: slate900,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  headerText: {
    fontSize: 8.5,
    lineHeight: 1.5,
    color: slate600,
  },
  clientLabel: {
    fontSize: 7.5,
    color: indigo700,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  clientName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: slate900,
    marginBottom: 3,
  },
  // Title section
  titleSection: {
    marginBottom: 18,
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: slate900,
  },
  invoiceTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: slate900,
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  projectRef: {
    fontSize: 9.5,
    color: slate700,
    fontFamily: 'Helvetica-Bold',
  },
  dateText: {
    fontSize: 9,
    color: slate600,
  },
  // Table
  table: {
    marginTop: 6,
    marginBottom: 18,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: slate50,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 3,
    marginBottom: 2,
  },
  tableHeaderText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: slate700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: slate200,
  },
  colLabel: { width: '40%' },
  colQty: { width: '12%' },
  colUnit: { width: '18%' },
  colVat: { width: '12%' },
  colTotal: { width: '18%' },
  cellLabel: { fontSize: 9, color: slate900, fontFamily: 'Helvetica-Bold' },
  cellText: { fontSize: 9, color: slate800 },
  cellMuted: { fontSize: 9, color: slate600 },
  cellDesc: { fontSize: 7.5, color: slate500, marginTop: 2 },
  // Totals + due date section
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 20,
  },
  dueDateBox: {
    backgroundColor: indigo50,
    borderWidth: 1,
    borderColor: indigo100,
    borderRadius: 5,
    padding: 12,
    width: '45%',
    alignSelf: 'flex-start',
  },
  dueDateLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: indigo700,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dueDateValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: slate900,
  },
  totalsBox: {
    width: '42%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalLabel: { fontSize: 9, color: slate600 },
  totalValue: { fontSize: 9, color: slate900, fontFamily: 'Helvetica-Bold' },
  totalTTCRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: slate900,
    borderRadius: 4,
    marginTop: 8,
  },
  totalTTCLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  totalTTCValue: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  // Terms
  termsSection: {
    marginTop: 4,
    marginBottom: 16,
    backgroundColor: slate50,
    padding: 10,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: slate200,
  },
  termsTitle: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: slate700,
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  termsText: {
    fontSize: 7.5,
    color: slate600,
    lineHeight: 1.6,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: slate200,
    paddingTop: 10,
  },
  footerCol: { width: '48%' },
  footerName: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: slate800,
    marginBottom: 3,
  },
  footerLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: indigo700,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  footerText: {
    fontSize: 7.5,
    color: slate600,
    lineHeight: 1.5,
  },
  footerMono: {
    fontSize: 7.5,
    color: slate800,
    fontFamily: 'Courier',
  },
});

function clientDisplayName(invoice: Invoice): string {
  if (invoice.client.type === 'entreprise') {
    return invoice.client.companyName || '';
  }
  return `${invoice.client.firstName || ''} ${invoice.client.lastName || ''}`.trim();
}

function clientAddress(invoice: Invoice): string {
  const parts = [
    invoice.client.address,
    `${invoice.client.postalCode} ${invoice.client.city}`,
    invoice.client.country,
  ].filter(Boolean);
  return parts.join('\n');
}

export default function InvoicePDF({ invoice }: { invoice: Invoice }) {
  const ht = totalHT(invoice.lines);
  const vatItems = vatBreakdown(invoice.lines);
  const ttc = totalTTC(invoice.lines);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerCol}>
            <Text style={styles.companyName}>{COMPANY_INFO.name}</Text>
            <Text style={styles.headerText}>
              {COMPANY_INFO.address}{'\n'}
              {COMPANY_INFO.postalCode} {COMPANY_INFO.city}, {COMPANY_INFO.country}{'\n'}
              SIRET : {COMPANY_INFO.siret}{'\n'}
              {COMPANY_INFO.email}{'\n'}
              {COMPANY_INFO.phone}
            </Text>
          </View>
          <View style={[styles.headerCol, { alignItems: 'flex-end' }]}>
            <Text style={styles.clientLabel}>Facturé à</Text>
            <Text style={[styles.clientName, { textAlign: 'right' }]}>{clientDisplayName(invoice)}</Text>
            {invoice.client.type === 'entreprise' && invoice.client.siret && (
              <Text style={[styles.headerText, { textAlign: 'right' }]}>SIRET : {invoice.client.siret}</Text>
            )}
            <Text style={[styles.headerText, { textAlign: 'right' }]}>{clientAddress(invoice)}</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.invoiceTitle}>Facture {invoice.number}</Text>
          <View style={styles.titleRow}>
            <Text style={styles.projectRef}>{invoice.title}</Text>
            <Text style={styles.dateText}>Émise le {fmtDate(invoice.issueDate)}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colLabel}><Text style={styles.tableHeaderText}>Libellé</Text></View>
            <View style={styles.colQty}><Text style={[styles.tableHeaderText, { textAlign: 'center' }]}>Qté</Text></View>
            <View style={styles.colUnit}><Text style={[styles.tableHeaderText, { textAlign: 'right' }]}>Prix unit. HT</Text></View>
            <View style={styles.colVat}><Text style={[styles.tableHeaderText, { textAlign: 'center' }]}>TVA</Text></View>
            <View style={styles.colTotal}><Text style={[styles.tableHeaderText, { textAlign: 'right' }]}>Total HT</Text></View>
          </View>
          {invoice.lines.map((line) => (
            <View key={line.id} style={styles.tableRow}>
              <View style={styles.colLabel}>
                <Text style={styles.cellLabel}>{line.label}</Text>
                {line.description ? <Text style={styles.cellDesc}>{line.description}</Text> : null}
              </View>
              <View style={styles.colQty}><Text style={[styles.cellText, { textAlign: 'center' }]}>{line.quantity}</Text></View>
              <View style={styles.colUnit}><Text style={[styles.cellText, { textAlign: 'right' }]}>{fmtCurrency(line.unitPrice)}</Text></View>
              <View style={styles.colVat}><Text style={[styles.cellMuted, { textAlign: 'center' }]}>{line.vatRate}%</Text></View>
              <View style={styles.colTotal}><Text style={[styles.cellLabel, { textAlign: 'right' }]}>{fmtCurrency(lineTotal(line))}</Text></View>
            </View>
          ))}
        </View>

        {/* Due date + Totals */}
        <View style={styles.bottomSection}>
          <View style={styles.dueDateBox}>
            <Text style={styles.dueDateLabel}>Échéance</Text>
            <Text style={styles.dueDateValue}>{fmtDate(invoice.dueDate)}</Text>
          </View>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total HT</Text>
              <Text style={styles.totalValue}>{fmtCurrency(ht)}</Text>
            </View>
            {vatItems.map((v) => (
              <View key={v.rate} style={styles.totalRow}>
                <Text style={styles.totalLabel}>TVA {v.rate}%</Text>
                <Text style={styles.totalValue}>{fmtCurrency(v.amount)}</Text>
              </View>
            ))}
            {vatItems.length === 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TVA</Text>
                <Text style={styles.totalValue}>{fmtCurrency(0)}</Text>
              </View>
            )}
            <View style={styles.totalTTCRow}>
              <Text style={styles.totalTTCLabel}>Total TTC</Text>
              <Text style={styles.totalTTCValue}>{fmtCurrency(ttc)}</Text>
            </View>
          </View>
        </View>

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>Termes et conditions</Text>
          <Text style={styles.termsText}>{invoice.terms}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerCol}>
            <Text style={styles.footerName}>{COMPANY_INFO.name}</Text>
            <Text style={styles.footerText}>
              SIRET : {COMPANY_INFO.siret}{'\n'}
              {COMPANY_INFO.vatMention}
            </Text>
          </View>
          <View style={[styles.footerCol, { alignItems: 'flex-end' }]}>
            <Text style={[styles.footerLabel, { textAlign: 'right' }]}>Mode de paiement</Text>
            <Text style={[styles.footerText, { textAlign: 'right' }]}>Virement bancaire</Text>
            <Text style={[styles.footerMono, { textAlign: 'right' }]}>IBAN : {COMPANY_INFO.iban}</Text>
            <Text style={[styles.footerMono, { textAlign: 'right' }]}>BIC : {COMPANY_INFO.bic}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
