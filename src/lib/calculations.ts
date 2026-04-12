import { LineItem } from './types';

export function lineTotal(line: LineItem): number {
  return line.quantity * line.unitPrice;
}

export function totalHT(lines: LineItem[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

export function vatBreakdown(lines: LineItem[]): { rate: number; amount: number }[] {
  const map = new Map<number, number>();
  for (const line of lines) {
    const ht = lineTotal(line);
    const vat = ht * (line.vatRate / 100);
    map.set(line.vatRate, (map.get(line.vatRate) || 0) + vat);
  }
  return Array.from(map.entries())
    .filter(([, amount]) => amount > 0)
    .map(([rate, amount]) => ({ rate, amount }))
    .sort((a, b) => a.rate - b.rate);
}

export function totalVAT(lines: LineItem[]): number {
  return vatBreakdown(lines).reduce((sum, v) => sum + v.amount, 0);
}

export function totalTTC(lines: LineItem[]): number {
  return totalHT(lines) + totalVAT(lines);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}
