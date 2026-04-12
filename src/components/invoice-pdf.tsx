'use client';

import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { Invoice } from '@/lib/types';
import { COMPANY_INFO } from '@/lib/constants';
import { lineTotal, totalHT, vatBreakdown, totalVAT, totalTTC } from '@/lib/calculations';

function fmtCurrency(amount: number): string {
  return amount.toFixed(2).replace('.', ',') + ' €';
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const accent = '#E8651A';
const accentBg = '#FFF0E6';
const borderColor = '#E5E5E5';
const textColor = '#111111';
const mutedColor = '#666666';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: textColor,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  headerCol: {
    width: '48%',
  },
  companyName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: accent,
    marginBottom: 6,
  },
  headerText: {
    fontSize: 8.5,
    lineHeight: 1.5,
    color: mutedColor,
  },
  // Title section
  titleSection: {
    marginBottom: 20,
  },
  invoiceTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: textColor,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  projectRef: {
    fontSize: 10,
    color: mutedColor,
  },
  dateText: {
    fontSize: 9,
    color: mutedColor,
  },
  // Client info in header right
  clientLabel: {
    fontSize: 8,
    color: accent,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  clientName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  // Table
  table: {
    marginTop: 10,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: accentBg,
    borderRadius: 3,
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: textColor,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: borderColor,
  },
  colLabel: { width: '40%' },
  colQty: { width: '12%', textAlign: 'center' },
  colUnit: { width: '18%', textAlign: 'right' },
  colVat: { width: '12%', textAlign: 'center' },
  colTotal: { width: '18%', textAlign: 'right' },
  cellText: { fontSize: 8.5 },
  cellDesc: { fontSize: 7.5, color: mutedColor, marginTop: 2 },
  // Totals + due date section
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20,
  },
  dueDateBox: {
    backgroundColor: accentBg,
    borderWidth: 1,
    borderColor: '#FFCBA4',
    borderRadius: 4,
    padding: 10,
    width: '45%',
  },
  dueDateLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: accent,
    marginBottom: 4,
  },
  dueDateValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  totalsBox: {
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalLabel: {
    fontSize: 9,
    color: mutedColor,
  },
  totalValue: {
    fontSize: 9,
  },
  totalTTCRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: borderColor,
    marginTop: 4,
  },
  totalTTCLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  totalTTCValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  // Terms
  termsSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  termsTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: accent,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  termsText: {
    fontSize: 7.5,
    color: mutedColor,
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
    borderTopColor: borderColor,
    paddingTop: 10,
  },
  footerCol: {
    width: '48%',
  },
  footerLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: accent,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  footerText: {
    fontSize: 7.5,
    color: mutedColor,
    lineHeight: 1.5,
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
  const vat = totalVAT(invoice.lines);
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
              N° TVA Intracom. : .{'\n'}
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
            <View style={styles.colQty}><Text style={[styles.tableHeaderText, { textAlign: 'center' }]}>Quantité</Text></View>
            <View style={styles.colUnit}><Text style={[styles.tableHeaderText, { textAlign: 'right' }]}>Prix unitaire HT</Text></View>
            <View style={styles.colVat}><Text style={[styles.tableHeaderText, { textAlign: 'center' }]}>TVA</Text></View>
            <View style={styles.colTotal}><Text style={[styles.tableHeaderText, { textAlign: 'right' }]}>Total HT</Text></View>
          </View>
          {invoice.lines.map((line) => (
            <View key={line.id} style={styles.tableRow}>
              <View style={styles.colLabel}>
                <Text style={styles.cellText}>{line.label}</Text>
                {line.description ? <Text style={styles.cellDesc}>{line.description}</Text> : null}
              </View>
              <View style={styles.colQty}><Text style={[styles.cellText, { textAlign: 'center' }]}>{line.quantity}</Text></View>
              <View style={styles.colUnit}><Text style={[styles.cellText, { textAlign: 'right' }]}>{fmtCurrency(line.unitPrice)}</Text></View>
              <View style={styles.colVat}><Text style={[styles.cellText, { textAlign: 'center' }]}>{line.vatRate}%</Text></View>
              <View style={styles.colTotal}><Text style={[styles.cellText, { textAlign: 'right' }]}>{fmtCurrency(lineTotal(line))}</Text></View>
            </View>
          ))}
        </View>

        {/* Due date + Totals */}
        <View style={styles.bottomSection}>
          <View style={styles.dueDateBox}>
            <Text style={styles.dueDateLabel}>Échéance de paiement</Text>
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
            <Text style={styles.footerLabel}>{COMPANY_INFO.name}</Text>
            <Text style={styles.footerText}>
              SIRET : {COMPANY_INFO.siret}{'\n'}
              {COMPANY_INFO.vatMention}
            </Text>
          </View>
          <View style={[styles.footerCol, { alignItems: 'flex-end' }]}>
            <Text style={[styles.footerLabel, { textAlign: 'right' }]}>Mode de paiement</Text>
            <Text style={[styles.footerText, { textAlign: 'right' }]}>
              Virement bancaire{'\n'}
              IBAN : {COMPANY_INFO.iban}{'\n'}
              BIC : {COMPANY_INFO.bic}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
